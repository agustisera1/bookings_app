# Feature de mensajería (socket.io) — estado y próximos pasos

> **Estado: el chat funciona end-to-end.** Verificado con dos cuentas (host y guest) sobre la
> misma reserva: handshake autenticado por cookie → join a room autorizado → mensaje persistido
> en Mongo → entregado a la contraparte, con render optimista y ack del lado del emisor.
>
> Contexto: el chat se movió del detalle de reserva a una vista propia (`/messages`, dos
> paneles). El documento de chat nace con el **primer mensaje**, no con la reserva, para que una
> reserva pendiente pueda llevar consultas antes de que el host confirme.

Los ítems de **performance** de esta feature viven en `PERFORMANCE.md` — incluido el índice faltante
de `messages` (punto 1), que es el más grave de la capa de datos. Acá está lo estructural.

Cada ítem lleva su ticket en [`docs/tickets/`](../tickets/README.md).

---

## 🔴 La regla de autorización está implementada dos veces, en dos repos — **TD-08**

- **Dónde:** `lib/services/chat.ts` (`resolveViewerParty`) y
  `bookings-app-worker/src/chat/parties.ts` (`findChatParties` + `isParty`, usados por
  `authorizeRoom` y por `registerMessageFlow`)
- **Qué pasa:** ambas responden la misma pregunta —¿este usuario es parte de este booking?—
  con los mismos dos pasos: comparar contra `booking.guest_id`, si no, buscar el listing en
  Mongo y comparar `host_id`. Son dos implementaciones de una sola regla de negocio.
- **Por qué duele:** el día que cambie quién puede leer un hilo (p. ej. bloquear reservas
  canceladas), se toca un repo y el otro sigue respondiendo lo viejo. La divergencia es
  silenciosa: el HTTP niega y el socket permite, o al revés.
- **Distinción que importa:** compartir **tipos** a mano entre repos está bien (es lo que ya
  hacemos con los payloads de BullMQ y con `EVENTS`). Compartir una **decisión** a mano no.
  Los datos se replican; las conclusiones se delegan a un solo dueño.
- **Fix elegido — el token la transporta.** El app firma un JWT corto que ya dice *para qué chat*
  estás autorizado; el worker solo verifica firma y no decide nada. Es el "ticket" que se
  descartó al elegir cookie forwarding — acá vuelve a tener sentido, y de paso destraba el
  `sameSite: "strict"` de más abajo.
- **Ojo:** `findChatParties` no se usa solo para autorizar. `registerMessageFlow` también lo usa
  para obtener `guest_id`/`host_id` **como datos** del upsert del chat. Metiendo las dos party ids
  en las claims del ticket, el worker deja de necesitar PG y Mongo para el flujo de chat entero.
- **Alternativas descartadas:** un endpoint interno que el worker consulte (suma latencia al join y
  acopla el worker a la disponibilidad del app), o que el app publique en Redis una proyección de
  quién puede entrar a qué room (escala, pero es eventualmente consistente y mucho más pesado).

---

## 🔴 El upsert del chat todavía puede duplicar — **TD-04**

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
  error hay que tratarlo como "ya existe" (que es lo correcto). Sin ese paso, el índice convierte
  una duplicación silenciosa en un error visible al usuario.
- **Nota:** no hay migraciones para Mongo en el proyecto, y los dos índices que existen están
  sueltos **dentro de scripts de seed** (`seed_listings.js:289`, `seed_notifications.js:98`) — un
  ambiente que no sembró datos no tiene índices. Definir un lugar canónico es parte del fix.

---

## 🟡 El `ack` del envío no tiene timeout — **TD-09**

El emisor **no** recibe su propio mensaje por el socket: el worker usa `socket.to(room)`, que
excluye al que emite. El cliente pinta la burbuja al instante con un id temporal y la reconcilia
con el `ack`, que trae el `_id` real de Mongo.

Si el worker se cae *después* de recibir el emit, el callback nunca corre y la burbuja se queda
`pending` para siempre — indistinguible de "en vuelo". Socket.io lo cubre con
`socket.timeout(ms).emit(...)`, que invoca el callback con un error cuando vence. Sin eso,
"enviando…" es un estado del que no se sale.

---

## 🟡 Robustez del transporte — **TD-09**

Los tres primeros son la misma omisión: **el cliente asume que la conexión es un hecho estable, y
no lo es.**

- **Reconexión: se pierde la membresía del room.** Al reconectar, el server crea un socket
  nuevo que no está en ningún room, y como `bookingId` no cambió el efecto que hace `join-chat` no
  vuelve a correr. Hay que re-emitirlo en el evento `connect`. Hoy el hilo simplemente deja de
  recibir mensajes sin avisar: la UI se ve perfecta y el chat está muerto.
- **`getSnapshot` abre la conexión.** `useSocket` (`components/chat/use-booking-chat.ts`)
  llama a `getSocketConnection()` desde el snapshot de `useSyncExternalStore`, que debe ser
  puro. El singleton lo hace idempotente, así que no explota, pero está invertido.
- **`subscribe` es no-op.** No se sincroniza ningún estado externo: el snapshot devuelve una
  referencia estable que nunca cambia. Lo que sí es estado reactivo es el **estado de
  conexión** (`connect` / `disconnect` / `connect_error`), y es lo que la UI necesita para
  mostrar "reconectando…" o deshabilitar el composer.
- **`auth` congelado.** Cuando **TD-08** pase el ticket por `auth`, tiene que ser una función
  (`auth: (cb) => cb({ ticket })`), que se re-evalúa en cada intento de conexión. Con un objeto
  literal el valor queda fijo y al expirar todas las reconexiones fallan en silencio.
- **Cookie `sameSite: "strict"`** (`lib/services/auth.ts:54,92`)**.** El handshake funciona en dev
  porque `localhost:3000` y `:4000` son *same-site* (el puerto no cuenta). Se rompe apenas el chat
  viva en otro dominio. Lo destraba **TD-08**: el ticket viaja por `auth`, no por cookie.

---

## Cómo probarlo end-to-end

1. Worker corriendo (`pnpm dev` en `bookings-app-worker`) — sostiene el socket en `:4000`.
2. Redis y Mongo levantados: el adapter y la persistencia del hilo dependen de ellos.
3. Dos sesiones en navegadores distintos (o una en incógnito): una cuenta **host** y una
   **guest** que compartan una reserva.
4. Abrir la misma conversación en las dos y escribir. El emisor renderiza optimista; el otro
   lado lo recibe por `server-message`.
