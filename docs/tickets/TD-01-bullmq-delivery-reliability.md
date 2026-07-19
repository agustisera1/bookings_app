# TD-01 — Que el worker falle cuando falla

| | |
|---|---|
| **Branch** | `fix/bullmq-delivery-reliability` |
| **Bloque** | Cola |
| **Prioridad** | 🔴 Alta |
| **Esfuerzo** | ~30 min |
| **Depende de** | — |
| **Origen** | [`tech_debt/EVENTS_FEATURE_NEXT_STEPS.md`](../tech_debt/EVENTS_FEATURE_NEXT_STEPS.md) § Bloqueantes |
| **Repos** | `bookings-app-worker` + `bookings_app` |

## Problema

Un mail que falla se marca como entregado y se pierde para siempre.

El diagnóstico original decía que el `try/catch` del processor se tragaba el error. **Eso ya está
resuelto**: `src/processors/dispatch.ts` re-lanza correctamente. El agujero que queda es más sutil
y está un nivel más abajo:

```ts
// src/processors/email.ts — notifyBooking
const { data, error } = await resend.emails.send({ ... });

if (data) console.info("[notifyBooking]: booking notification sent");
if (error) {
  console.error("[notifyBooking]: could not send booking notification");
  console.error(error);   // ← se loguea y la función resuelve OK
}
```

El SDK de Resend **no lanza** ante un fallo de envío: devuelve `{ data, error }`. Como
`notifyBooking` solo loguea el `error`, la promesa resuelve, `dispatch` no tiene nada que
re-lanzar, y BullMQ marca el job *completed*. Un timeout o un rate limit de Resend queda como una
línea en un log que nadie mira.

`greetUser` tiene la misma falla en otra forma: hace `await resend.emails.send(...)` y **descarta
el resultado entero**, así que ni siquiera loguea.

Encima las colas se declaran sin política de reintentos:

```ts
// bookings_app/lib/events.ts
export const emailQueue = new Queue("emails", { connection });        // sin defaultJobOptions
export const notificationsQueue = new Queue("notifications", { connection });
```

Neto: el sistema es *at-most-once*, y ante cualquier hipo de Resend es *zero*.

## Por qué entra

Pasa por los **dos** criterios.

- **Aprendizaje:** es la lección central de una cola. El valor de BullMQ es *at-least-once* — que
  el job sobreviva a un worker caído y se reintente. Con el error tragado, esa garantía no existe
  y la cola es un `setTimeout` caro. Entender que **un handler que no lanza es un job que no
  reintenta** es lo que hace que la tecnología tenga sentido.
- **Deploy:** pérdida silenciosa de notificaciones. Y sin `removeOnComplete`, Redis crece sin techo
  en cualquier deploy que dure — eso solo ya rompe un ambiente real.

Además es el mejor retorno del backlog: dos líneas de fix real sobre una arquitectura que ya está
bien separada.

## Alcance

**Worker** (`bookings-app-worker`):
- `src/processors/email.ts` → `notifyBooking`: si Resend devuelve `error`, lanzar. El log se
  mantiene, pero deja de ser la única consecuencia.
- `src/processors/email.ts` → `greetUser`: chequear el resultado igual que `notifyBooking`. Hoy ni
  se mira.

**App** (`bookings_app`):
- `lib/events.ts`: `defaultJobOptions` en las dos colas.
  ```ts
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  }
  ```
  Va en el **producer** porque las opciones viajan con el job, no con el worker.

## Criterio de aceptación

- [ ] Con una `RESEND_API_KEY` inválida, el job aparece como **failed** en BullMQ — no como
      completed.
- [ ] Se observan los 3 intentos con backoff creciente antes de que quede en failed.
- [ ] Un job exitoso desaparece de Redis según `removeOnComplete` en vez de acumularse.
- [ ] `accept` / `reject` de una reserva **siguen sin fallar** con el worker apagado: la mutación
      de negocio no puede depender de la notificación (RNF-04).

> El último punto es el que hay que cuidar: el objetivo es que falle **el job**, no la operación
> que lo encoló.

## Fuera de alcance

- **Idempotencia** → TD-02. Habilitar reintentos abre la puerta al mail duplicado; se cierra ahí,
  no acá. Los dos tickets son secuenciales a propósito: primero se ve el problema, después se
  arregla.
- **Dominio verificado en Resend.** Es config del servicio, no código.
- **Unificar la config de Redis** entre producer (`REDIS_HOST/PORT/...`) y worker (`REDIS_URL`).
