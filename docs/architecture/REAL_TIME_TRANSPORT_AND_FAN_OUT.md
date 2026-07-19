# Transporte en tiempo real (notificaciones + mensajería) y fan-out entre procesos

- **Estado:** Decidido
- **Fecha:** 2026-07-13
- **Fase:** 5 (workers / notificaciones), con vistas a mensajería host↔guest
- **Contexto conceptual:** ver [`TERMINOLOGY.md`](../insights/TERMINOLOGY.md) (qué es un *job*, *fan-out* y *el borde*)

---

## Contexto

Estamos integrando entrega en tiempo real. El primer caso son las **notificaciones in-app**, hoy ya
implementadas de punta a punta: el worker (proceso Node aparte) rehidrata usuario + listing, arma el
documento de notificación, lo **persiste en Mongo** (`insertNotification`) y lo **publica** al canal
Redis (`sendNotification` en el repo del worker); la ruta SSE de Next lo empuja al cliente. El segundo
caso, más adelante, es **mensajería host↔guest**.

La duda que disparó este documento: **¿socket.io es la herramienta apropiada, o hay una solución de
Redis / BullMQ que evite montar sockets?** Ya usamos Redis + BullMQ para los emails, así que valía
preguntarse si esa misma infra resolvía la entrega en vivo.

La respuesta corta es que la pregunta mezcla **dos capas distintas**. No es "socket.io **o**
Redis/BullMQ": es elegir una herramienta **de cada capa**.

```
Worker ──[capa B: fan-out entre procesos]──▶ Proceso del borde ──[capa A: transporte al borde]──▶ Client
         Redis pub/sub · Streams · BullMQ                         SSE · WebSocket · socket.io
```

- **Capa A — el borde (servidor ↔ navegador).** Un browser solo habla HTTP/WebSocket; no habla
  Redis ni BullMQ. *Algo* tiene que sostener la conexión con el cliente.
- **Capa B — fan-out entre procesos.** El worker corre en otro proceso que el que sostiene la
  conexión con el cliente. Necesitamos un canal para que el worker le avise al proceso del borde
  "empujá esto".

---

## Decisión

1. **Borde (capa A): incremental según la feature.**
   - **Notificaciones (ahora): SSE**, servido desde una ruta de **Next.js**. Es one-way
     (server→client), que es exactamente lo que necesitan; socket.io sería overkill. Bonus decisivo:
     al vivir en el **mismo origen** que la app, la cookie httpOnly del JWT viaja sola → `authorize()`
     en la ruta funciona igual que en cualquier route handler, **sin CORS ni handshake especial**.
   - **Mensajería (más adelante): socket.io**, porque es **bidireccional** (SSE no sirve ahí) y querés
     rooms/acks/reconexión. Cuando llegue, se evalúa si convive con SSE o si las notificaciones migran
     a un transporte único.
2. **Fan-out (capa B): Redis pub/sub — en ambos casos.** El worker persiste y **publica** a un canal;
   el proceso del borde (la ruta SSE de Next hoy; el servidor socket.io mañana) está **suscrito** y
   empuja al cliente. Para notificaciones se usa pub/sub **crudo** (un suscriptor Redis compartido en
   Next que reparte a las conexiones SSE por `userId`); para socket.io sería su **Redis adapter/emitter**
   (el mismo pub/sub por debajo). El worker nunca sostiene conexiones con el cliente.
3. **BullMQ se queda donde brilla:** trabajo durable de *consume-once* (emails hoy; sync a
   Elasticsearch en Fase 4). **No** se usa para entregar realtime.
4. **Fuente de verdad = la DB, no el canal en vivo.** La notificación se persiste en Mongo **antes**
   de emitir. El fan-out es entrega best-effort: si el cliente está offline, no se reintenta — lo
   trae de Mongo en el próximo load. Idem mensajería: el historial vive en la DB (Postgres/Mongo),
   el canal en vivo es solo transporte.

---

## Por qué

### Por qué **no** BullMQ para la entrega en vivo

BullMQ es una **cola de jobs**: cada job lo consume **un** worker, **una** vez, con retry y
durabilidad. Es exactamente lo que querés para "mandá este email una sola vez". Entregar una
notificación en vivo es lo **opuesto**: es *fan-out* efímero a quien esté conectado. Meter BullMQ ahí
fuerza semántica de *consume-once* donde querés *broadcast*, y agrega durabilidad/retry que acá no
sirve (la verdad ya está en Mongo). Herramienta equivocada para el trabajo.

### Por qué SSE ahora y socket.io después (y no uno solo para todo)

El borde se elige **por feature**, según la dirección del tráfico:

- **Notificaciones son one-way** (server→client). **SSE** es la herramienta del tamaño justo:
  reconexión nativa del browser (`EventSource`), más simple, y —al servirse desde Next— **same-origin**,
  lo que hace que la cookie del JWT viaje sola. Montar socket.io acá sería overkill y encima
  reintroduciría el problema de auth cross-origin.
- **Mensajería es bidireccional** (el guest escribe, el host escribe) → SSE **no sirve**. Ahí sí entra
  **socket.io**: rooms (una por conversación), acks ("entregado") y reconexión, que a mano son mucho
  código. Como esa inversión solo se justifica cuando llega el chat, no la adelantamos.
- **`ws` pelado** queda descartado en los dos casos: reimplementaría reconexión/rooms/acks que SSE
  (para one-way) o socket.io (para bidireccional) ya dan.

La clave es que **la capa B no cambia** con esta decisión: SSE o socket.io es solo el último tramo
hacia el browser; el fan-out entre procesos sigue siendo Redis pub/sub en ambos.

### Por qué Redis pub/sub como fan-out

Es *fan-out* nativo (un mensaje → N suscriptores) y ya tenemos Redis en la infra por BullMQ. Sirve
igual para los dos bordes: la ruta SSE lo consume con un cliente Redis suscriptor crudo, y socket.io
lo consume vía su adapter/emitter (construido sobre el mismo pub/sub). En ninguno de los dos el worker
sostiene conexiones con el cliente: solo publica.

---

## Alternativas consideradas

| Opción | Capa | Veredicto |
|--------|------|-----------|
| **SSE** | Borde | **Elegida para notificaciones (ahora).** One-way alcanza; servida desde Next es same-origin → auth trivial, sin CORS. No sirve para mensajería (unidireccional). |
| **socket.io** | Borde | **Elegida para mensajería (más adelante).** Bidireccional, rooms, acks, reconexión. No se adelanta: para notificaciones sería overkill y agregaría auth cross-origin. |
| **`ws` pelado** | Borde | Descartada en ambos casos: reimplementaría reconexión/rooms/acks que SSE (one-way) o socket.io (bidireccional) ya dan. |
| **BullMQ como transporte realtime** | Fan-out | Descartada: semántica *consume-once* + durabilidad, opuesta al *fan-out* efímero que necesitamos. Se queda para jobs durables. |
| **Redis pub/sub** | Fan-out | **Elegida (ambos bordes).** Fan-out nativo, reusa el Redis existente. Crudo para la ruta SSE; vía adapter/emitter para socket.io. |
| **Redis Streams (adapter o crudo)** | Fan-out | Fuera de scope. Da durabilidad/replay, pero nuestra fuente de verdad es la DB (ver [Sobre el at-most-once del fan-out](#sobre-el-at-most-once-del-fan-out-por-qué-lo-aceptamos)). Upgrade futuro si algún día el canal en vivo fuera la fuente de verdad o escalamos horizontal. |

---

## Sobre el at-most-once del fan-out (por qué lo aceptamos)

Redis pub/sub es **at-most-once**: si en el momento del `PUBLISH` no hay un suscriptor conectado (o la
conexión se cae en el medio), ese mensaje se **descarta y no vuelve**. Es una limitación real del
transporte, no un bug. La pregunta correcta no es "¿pub/sub puede perder mensajes?" sino
**"¿dependemos de pub/sub para no perder la notificación?"** — y por diseño, **no**.

La clave es el **orden en el worker: persistir en la DB primero, fan-out después**. La DB es la fuente
de verdad; el pub/sub es entrega en vivo, descartable. El peor caso de una pérdida:

1. El worker inserta la notificación en Mongo ✅ (existe, pase lo que pase).
2. El worker publica a Redis → se pierde (Next reiniciándose, hipo de red, nadie suscrito ese instante).
3. El usuario no ve el aviso **instantáneo**.
4. Pero el badge cuenta desde Mongo (`getNotificationsCount`), y en el próximo fetch/navegación la
   notificación aparece igual.

El costo de perder un mensaje pub/sub no es "notificación perdida para siempre" — es "**el aviso en
vivo llegó tarde**". La correctitud la garantiza la DB, no el canal en vivo.

**Patrón que cierra el hueco (casi gratis):** los clientes de tiempo real reconectan solos
(`EventSource` y socket.io ambos). Si en cada (re)conexión el cliente **refetchea las notificaciones
desde la DB**, cualquier cosa perdida mientras estuvo desconectado se recupera ahí. La DB pasa a ser
el mecanismo de reconciliación y la ventana de pérdida de pub/sub se vuelve irrelevante para la
correctitud.

**Cuándo *sí* haría falta durabilidad en el fan-out (Redis Streams):** solo si el canal en vivo fuera
la **fuente de verdad** — sin una DB que respalde el historial y con necesidad de replay desde la
propia infra de mensajería. No es nuestro caso ni para notificaciones ni para el chat futuro (su
historial también vivirá en una tabla). Por eso Streams sería resolver un problema que ya diseñamos
afuera: complejidad (consumer groups, acks, trimming) sin pago. Se revisita solo si aparece un caso
donde la entrega en vivo sea la fuente de verdad. (Nota: el "redis-streams-adapter" diferido es la
variante **de socket.io** para transporte cross-instancia; usar Streams acá sería `XADD`/`XREADGROUP`
crudo, otra cosa.)

---

## Consecuencias

**Positivas**
- Una sola pieza de infra (Redis pub/sub) resuelve el cross-process de **ambas** features.
- El worker sigue desacoplado: publica al canal, no sostiene conexiones.
- Reusa el Redis que ya existe; BullMQ no se toca y conserva su rol claro.
- **Notificaciones no agregan un proceso nuevo:** el borde SSE vive dentro de Next (same-origin,
  auth trivial). El proceso de sockets recién aparece con la mensajería.
- Camino incremental: entregás valor ahora con lo más simple y difereís la complejidad de socket.io
  a cuando el chat la justifique.

**A resolver al implementar — notificaciones (SSE, ahora)**
- **Ruta SSE en Next.js.** Route handler que devuelve un stream `text/event-stream`, en **runtime
  Node** (no edge) para sostener la conexión larga. Auth con `authorize()` en la ruta (same-origin,
  la cookie viaja sola).
- **Un suscriptor Redis compartido.** El proceso Next abre **una** suscripción al canal y reparte a
  las conexiones SSE en memoria filtrando por `userId` — **no** una suscripción Redis por cliente.
- **Refetch en el (re)connect.** Al abrir/reabrir el `EventSource`, el cliente refetchea de Mongo para
  reconciliar lo que se haya perdido mientras estuvo desconectado (ver la sección de at-most-once).
- **Orden en el worker.** Persistir en Mongo **primero**, publicar después. Ya implementado:
  `sendNotification` inserta con `insertNotification` y recién ahí publica al canal
  (`src/processors/notifications.ts`).

**A resolver más adelante — mensajería (socket.io)**
- **Proceso de sockets.** Definir si vive junto al worker o como proceso propio (el emitter permite
  separarlos; el worker no necesita ser servidor de sockets).
- **Auth del handshake.** Acá **sí** aplica el problema cross-origin que SSE-en-Next evita: el
  servidor socket.io está en otro origen/puerto → cookie cross-origin (CORS con credentials) o token
  corto en el handshake. Sin esto, cualquiera se suscribe a conversaciones ajenas (RNF-05, ownership).
- **Routing.** En el connect, autenticar el socket y unirlo a las rooms que correspondan (por `userId`
  y por conversación); emitir con `io.to(room).emit(...)`.

**Transversal**
- **Seguridad de Redis.** pub/sub no firma ni cifra los mensajes → Redis no debe quedar expuesto a
  redes no confiables.

**Negativas / deuda asumida**
- Una conexión Redis extra (el suscriptor del borde), y —cuando llegue la mensajería— un proceso de
  sockets más para operar.
- Posible convivencia de **dos transportes** (SSE + socket.io) si no se unifica al llegar el chat.
- Sin durabilidad en la entrega en vivo (pub/sub es at-most-once) — asumido a propósito: la DB es la
  fuente de verdad. Ver [Sobre el at-most-once del fan-out](#sobre-el-at-most-once-del-fan-out-por-qué-lo-aceptamos).
