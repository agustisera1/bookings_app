# TD-26 — Trazabilidad del ruteo de jobs en el worker

| | |
|---|---|
| **Branch** | `refactor/worker-job-dispatch` |
| **Bloque** | Worker / Colas |
| **Prioridad** | 🟠 Media |
| **Esfuerzo** | ~3-4 h |
| **Depende de** | — (**bloquea TD-25**: conviene hacerlo antes) |
| **Origen** | Costo de trazabilidad detectado al planificar [TD-25](./TD-25-message-notifications.md) |
| **Repos** | `bookings-worker` (código) + `bookings_app` (docs compartidas) |

## Problema

De *"se aceptó un booking"* a *"corre esta función"* hay seis saltos, y cuatro son búsquedas en un
diccionario por string que se resuelven en runtime:

```mermaid
flowchart LR
  E["event_type<br/>'booking.accepted'"] -.-> B["BOOKING_EVENTS[…]"]
  B -.-> Q["queues[job.queue]"]
  Q -.-> P["jobs[processorKey]"]
  P --> H["handler"]
```

Ninguna flecha punteada la sigue el editor: ni "ir a la definición" ni "buscar referencias" cruzan
una indexación por string. No hay una cadena de llamadas para leer; hay cuatro tablas que hay que
reconstruir a mano cada vez. **Ese es el costo, y no es el volumen de abstracción: es que casi toda
la que hay es del tipo que ninguna herramienta puede seguir.**

Encima, `createProcessor` **cuesta tipado**. Tipa las *claves* del job map, pero le entrega a cada
handler un `Job` pelado — por eso todos arrancan con `job.data as XxxPayload`, un cast sin
verificar. Al agregar un `processorKey`, si no lo registrás en el map, el compilador no dice nada:
se descubre en runtime con `Invalid job processor`.

Un tercer efecto, más callado: las piezas de **un** evento viven en cinco carpetas distintas
(`events.ts`, `notifications/content.ts`, `notifications/build-notification.ts`,
`processors/notifications.ts`, y el disparador), y ninguna se llama como el evento. El repo está
cortado **por mecanismo**, no por feature. La prueba de que al revés se lee mejor está en el mismo
repo: `src/chat/` está cortado por feature y es la parte que se entiende sin saltar.

## Por qué entra, y por qué antes de TD-25

- **TD-25 agrega el primer productor que no viene del outbox** y un segundo `processorKey` a la cola
  de notificaciones. Sobre la estructura de hoy, eso son cinco archivos en cinco carpetas y un
  registro que el compilador no exige. Hacerlo después es refactorizar el doble de superficie.
- **El compilador pasa a trabajar a favor.** Con la unión discriminada y el `switch`, agregar el tipo
  de mensaje **marca el switch como incompleto**: la lista de pendientes de TD-25 la da `tsc`.
- **No cambia comportamiento.** Es movimiento de código y un cambio de forma de ruteo. Cero riesgo
  funcional, verificable con `npm run build` y el flujo end-to-end que ya existe.

## Alcance

### 1. `switch` sobre la unión discriminada, en vez de `createProcessor`

`processorKey` ya es un literal en cada `*Payload`: alcanza con volver `NotificationJobPayload` /
el payload de emails una **unión discriminada** por ese campo y rutear con un `switch`.

```ts
export async function notificationsProcessor(job: Job) {
  const payload = job.data as NotificationJobPayload; // un solo cast, en el borde
  switch (payload.processorKey) {
    case "send-notification":
      return sendBookingNotification(payload);
    // el `case` que falta lo marca tsc, no el runtime
  }
}
```

- Cada handler pasa a recibir **su payload ya tipado**, no un `Job`: se van los `as` de adentro.
- `processors/dispatch.ts` se elimina.
- El log uniforme que daba el wrapper se recupera —mejor— en `index.ts` con
  `worker.on("failed", …)`: un solo lugar para todas las colas, y encima cubre los fallos que hoy
  no pasan por `createProcessor`.
- El re-throw deja de ser necesario: si el handler tira, BullMQ ya marca el job fallido.

### 2. Un archivo por evento, con su copy + su builder + su handler

Los `processors/*.ts` quedan reducidos a **el switch de su cola** (el índice), y cada evento se
lee entero en un archivo:

| Antes | Después |
|---|---|
| `notifications/content.ts` + `notifications/build-notification.ts` + el handler en `processors/notifications.ts` | `notifications/booking.ts` — copy, builder y handler del evento |
| `templates/booking-email.ts` + `templates/greeting-email.ts` + los handlers en `processors/email.ts` | `emails/booking.ts` / `emails/greeting.ts` — misma idea |

`src/events.ts` **se queda como está**: es el espejo del contrato del otro repo, replicado a mano.
Tenerlo en un solo archivo es lo que hace revisable esa réplica.

Con esto, la sección "Piezas" de TD-25 pasa de cinco archivos en cinco carpetas a: un archivo nuevo
(`notifications/message.ts`, el evento de punta a punta), un `case` en el switch, el tipo en
`events.ts` y tres líneas en `chat/message-flow.ts`.

### 3. Sincronía de documentación (parte del alcance, no un extra)

Este cambio **invierte patrones canónicos ya escritos**. Sin actualizarlos, el próximo que agregue
un job sigue el mapa viejo:

| Doc | Qué afirma hoy | Acción |
|---|---|---|
| `bookings-app-worker/CLAUDE.md` § 4 | Se titula *"Dispatcher genérico por `processorKey` (job map, **no switch**)"* y lo justifica | Reescribir el patrón: el switch como ruteo, con el porqué (narrowing + exhaustividad) |
| ídem § "Estructura del repo", § 10, § checklist | Listan `processors/dispatch.ts` y el log de `createProcessor` | Actualizar árbol, manejo de errores y checklist |
| `docs/architecture/BULLMQ_QUEUES.md` § `processorKey`, § "Cómo se ve hoy", § "Agregar un nuevo job processor" (pasos 3-4), § checklist | Enseñan el job map como la forma de rutear | Reescribir. **Copia idéntica en los dos repos** — se actualizan las dos en el mismo cambio |

## Criterio de aceptación

- [ ] `processors/dispatch.ts` no existe y nada importa `createProcessor`.
- [ ] Ningún handler hace `job.data as …`: el cast ocurre una sola vez, en el switch de cada cola.
- [ ] Agregar un `processorKey` a la unión y **no** cubrirlo rompe `tsc`.
- [ ] Un job fallido sigue apareciendo en el log con su cola y su causa (vía `worker.on("failed")`).
- [ ] Cada evento se lee entero en un archivo: copy, builder/template y handler juntos.
- [ ] `npm run build` verde y el flujo end-to-end intacto: crear una reserva sigue disparando su mail
      y su notificación in-app.
- [ ] Los cuatro documentos de la tabla de arriba reflejan el patrón nuevo, con las dos copias de
      `BULLMQ_QUEUES.md` idénticas entre sí.

## Fuera de alcance

- **Colapsar `redis/queues.ts` + `redis/workers.ts`** en un archivo por cola. Es real, pero se toca
  una vez por cola —no por evento—, así que no es lo que duele al agregar un job.
- **Sacar la indirección `QueuedJob`** (que `toJobs` devuelva jobs en vez de encolar). Esa
  indirección se paga sola si existe el test que la justifica; hoy el worker **no tiene ninguno**.
  El primer test del repo es justamente `toJobs`, y va en su propio ticket.
- **Corregir la sección de tests de `CLAUDE.md` del producer**, que afirma que el worker corre
  Vitest con `npm test`: no hay `vitest` ni script `test` en su `package.json`. Es una línea, pero
  pertenece al ticket del primer test, no a este.
- Tocar `BOOKING_EVENTS` en `outbox/fan-out.ts`: cuatro eventos con la misma forma en una tabla que
  se lee de un vistazo es la abstracción que **sí** paga.
