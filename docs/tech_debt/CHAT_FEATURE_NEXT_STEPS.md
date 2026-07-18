# Feature de mensajería (socket.io) — estado y próximos pasos

> **Estado: el chat funciona end-to-end.** Verificado con dos cuentas (host y guest) sobre la
> misma reserva: handshake autenticado por cookie → join a room autorizado → mensaje persistido
> en Mongo → entregado a la contraparte, con render optimista y ack del lado del emisor.
>
> Contexto: el chat se movió del detalle de reserva a una vista propia (`/messages`, dos
> paneles). El documento de chat nace con el **primer mensaje**, no con la reserva, para que una
> reserva pendiente pueda llevar consultas antes de que el host confirme.
>
> Lo que falta es la **capa de datos del hilo** (la bandeja se deriva de reservas), cerrar la
> duplicación de la regla de autorización entre repos, y la robustez del envío.

Los ítems de **performance** de esta feature viven en `PERFORMANCE.md` (puntos 6–7 de alto
impacto y 6–9 de bajo). Acá está lo estructural.

---

## 🔴 La lista de conversaciones se deriva de reservas, no de chats

- **Dónde:** `lib/services/chat.ts` (`getUserConversations`)
- **Qué pasa:** no existe una query de "los chats donde participo", así que el rail se arma
  desde `bookings`: cada reserva es una conversación, haya hablado alguien o no.
- **Consecuencias visibles:**
  - Filas sin **último mensaje** ni preview — no hay de dónde sacarlos.
  - Sin **no leídos**.
  - Orden por `start_date` de la reserva, **no por actividad** del hilo, que es lo que
    espera cualquiera que use una bandeja.
  - Aparecen reservas canceladas/rechazadas de hace meses, mezcladas con hilos vivos.
- **Fix:** un `findChatsByParticipant` en `lib/repositories/chat.mongo.ts` que devuelva los
  documentos de chat del usuario con su último mensaje. Resuelve los cuatro puntos de arriba
  y de paso acota la lista (ver `PERFORMANCE.md` punto 7).
- **Ojo:** hoy el documento de chat **solo se escribe cuando alguien habla**. Si el rail pasa
  a leer de `chats`, una reserva sin mensajes desaparece de la bandeja. Hay que decidir:
  crear el chat al confirmar la reserva, o unir (`chats` ∪ `bookings`) en el rail.

---

## 🔴 La regla de autorización está implementada dos veces, en dos repos

- **Dónde:** `lib/services/chat.ts` (`resolveViewerParty`) y
  `bookings-app-worker/src/chat/auth.ts` (`authorizeRoom`)
- **Qué pasa:** ambas responden la misma pregunta —¿este usuario es parte de este booking?—
  con los mismos dos pasos: comparar contra `booking.guest_id`, si no, buscar el listing en
  Mongo y comparar `host_id`. Son dos implementaciones de una sola regla de negocio.
- **Por qué duele:** el día que cambie quién puede leer un hilo (p. ej. bloquear reservas
  canceladas), se toca un repo y el otro sigue respondiendo lo viejo. La divergencia es
  silenciosa: el HTTP niega y el socket permite, o al revés.
- **Distinción que importa:** compartir **tipos** a mano entre repos está bien (es lo que ya
  hacemos con los payloads de BullMQ y con `EVENTS`). Compartir una **decisión** a mano no.
  Los datos se replican; las conclusiones se delegan a un solo dueño.
- **Opciones de fix**, de más liviana a más pesada:
  1. **El token la transporta.** El app firma un JWT corto que ya dice *para qué chat* estás
     autorizado; el worker solo verifica firma y no decide nada. Es el "ticket" que se
     descartó al elegir cookie forwarding — acá vuelve a tener sentido.
  2. **El worker pregunta.** Endpoint interno del app. Explícito, pero suma latencia al join
     y acopla el worker a la disponibilidad del app.
  3. **El dueño empuja.** El app publica en Redis quién puede entrar a qué room y el worker
     lee esa proyección. Escala, es eventualmente consistente.

---

## 🔴 El upsert del chat todavía puede duplicar

- **Dónde:** `bookings-app-worker/src/mongo/chats.mongo.ts` (`upsertChatByBookingId`)
- **Qué pasa:** el `updateOne(..., { $setOnInsert }, { upsert: true })` reemplazó un
  find-then-insert y **achica** la ventana de carrera, pero no la cierra: sin un índice único,
  dos upserts concurrentes sobre un `booking_id` que no existe pueden insertar los dos.
  MongoDB solo garantiza la atomicidad del upsert **si hay un índice único sobre el filtro**.
- **Por qué importa:** dos documentos de chat para la misma reserva significan que
  `findChatByBookingId` devuelve uno arbitrario, y `started_at` deja de ser estable.
- **Fix:**
  ```js
  db.chats.createIndex({ booking_id: 1 }, { unique: true })
  ```
  Con el índice puesto, el upsert concurrente falla con `E11000` en vez de duplicar, y ese
  error se puede tratar como "ya existe" (que es lo correcto).
- **Nota:** no hay migraciones para Mongo en el proyecto. Definir dónde vive este índice —
  probablemente junto a los seeds en `scripts/`.

---

## 🟡 Robustez del envío (render optimista)

El emisor **no** recibe su propio mensaje por el socket: el worker usa `socket.to(room)`, que
excluye al que emite. El cliente pinta la burbuja al instante con un id temporal y la reconcilia
con el `ack`, que trae el `_id` real de Mongo. Eso deja dos huecos:

- **Un mensaje fallido no se puede reintentar.** Si el `ack` vuelve `{ ok: false }`, la burbuja
  queda marcada "Not sent" y ahí muere: el texto sigue en pantalla pero no hay forma de
  reenviarlo ni se recupera al recargar. Falta tap-para-reintentar (el `ThreadMessage` ya tiene
  `failed`, así que es UI + reusar `sendMessage`) o, como mínimo, devolver el texto al composer.
- **El `ack` no tiene timeout.** Si el worker se cae *después* de recibir el emit, el callback
  nunca corre y la burbuja se queda `pending` para siempre — indistinguible de "en vuelo".
  Socket.io lo cubre con `socket.timeout(ms).emit(...)`, que invoca el callback con un error
  cuando vence. Sin eso, "enviando…" es un estado del que no se sale.

---

## 🟡 Robustez del transporte

- **Reconexión: se pierde la membresía del room.** Al reconectar, el server crea un socket
  nuevo que no está en ningún room. Hay que re-emitir `join-chat` en el evento `connect`.
  Hoy el hilo simplemente deja de recibir mensajes sin avisar.
- **`getSnapshot` abre la conexión.** `useSocket` (`components/chat/use-booking-chat.ts`)
  llama a `getSocketConnection()` desde el snapshot de `useSyncExternalStore`, que debe ser
  puro. El singleton lo hace idempotente, así que no explota, pero está invertido.
- **`subscribe` es no-op.** No se sincroniza ningún estado externo: el snapshot devuelve una
  referencia estable que nunca cambia. Lo que sí es estado reactivo es el **estado de
  conexión** (`connect` / `disconnect` / `connect_error`), y es lo que la UI necesita para
  mostrar "reconectando…" o deshabilitar el composer.
- **`auth` congelado.** Si en algún momento se pasa a token por `auth`, tiene que ser una
  función (`auth: (cb) => cb({ token })`), que se re-evalúa en cada intento de conexión. Con
  un objeto literal el token queda fijo y al expirar todas las reconexiones fallan en
  silencio.
- **Cookie `sameSite: "strict"`.** El handshake funciona en dev porque `localhost:3000` y
  `:4000` son *same-site* (el puerto no cuenta). Se rompe apenas el chat viva en otro
  dominio. Ahí hace falta el ticket del punto anterior, o `SameSite=None; Secure`.

---

## 🟡 UI

- **Mobile apila los paneles.** `/messages` pone el rail arriba y el hilo abajo en pantallas
  chicas. Funciona, pero lo correcto es mostrar rail **o** hilo según haya conversación
  seleccionada. El layout no conoce la ruta, así que necesita moverse a las páginas o leer el
  segmento activo.
- **`bookings/[id]` trae todas las reservas para un título.** Reusa `GetUserBookings` porque
  no existe una query de reserva única, y filtra en memoria. Además solo mira `guestBookings`,
  así que **un host abriendo su propia reserva ve el título de fallback**. Quiere un
  `booking(id:)` en el schema.

---

## Cómo probarlo end-to-end

1. Worker corriendo (`pnpm dev` en `bookings-app-worker`) — sostiene el socket en `:4000`.
2. Redis y Mongo levantados: el adapter y la persistencia del hilo dependen de ellos.
3. Dos sesiones en navegadores distintos (o una en incógnito): una cuenta **host** y una
   **guest** que compartan una reserva.
4. Abrir la misma conversación en las dos y escribir. El emisor renderiza optimista; el otro
   lado lo recibe por `server-message`.
