# TD-02 — Idempotencia por `jobId`

| | |
|---|---|
| **Branch** | `feat/bullmq-idempotency` |
| **Bloque** | Cola |
| **Prioridad** | 🟠 Media |
| **Esfuerzo** | ~1 h |
| **Depende de** | **TD-01** |
| **Origen** | [`tech_debt/EVENTS_FEATURE_NEXT_STEPS.md`](../tech_debt/EVENTS_FEATURE_NEXT_STEPS.md) § Robustez |
| **Repos** | `bookings_app` |

## Problema

BullMQ es *at-least-once*: garantiza que el job se procese **al menos** una vez, no exactamente una.
Un reintento puede correr después de que el efecto ya ocurrió.

Hoy no se nota porque no hay reintentos (TD-01). En cuanto TD-01 los habilite, aparece el caso:
Resend envía el mail, pero la respuesta se pierde por timeout de red → el handler lanza → BullMQ
reintenta → **el guest recibe el mail dos veces**. Nada en el sistema lo previene: no hay dedup por
`jobId` ni por reserva.

## Por qué entra

**Aprendizaje**, y es la mitad que le falta a TD-01.

Activar reintentos sin idempotencia es cambiar "pierdo mails" por "mando mails de más" — se cambia
un problema por otro. La lección completa de una cola son las dos piezas juntas: *at-least-once*
te obliga a hacer el consumidor idempotente, y el `jobId` determinístico es la herramienta que
BullMQ da para eso.

Es también el ticket que mejor muestra por qué el orden importa: hacerlo **después** de TD-01
significa haber visto el duplicado antes de prevenirlo.

## Alcance

Los **call sites de `.add()`** en `lib/services/*`, no `lib/events.ts`: la clave se deriva del evento
de dominio concreto (esta reserva, esta etapa), así que solo puede armarse donde ese evento existe.
`lib/events.ts` define el contrato y la política de la cola; el `jobId` es por-job.

- `lib/services/bookings.ts` → `emailBookingDetails`
- `lib/services/auth.ts` → `greetUser`

Un `jobId` determinístico derivado del evento de dominio, no aleatorio. La clave tiene que
identificar **el hecho**, no la invocación:

```ts
// La reserva + la etapa del ciclo de vida. Reencolar el mismo hecho
// es un no-op; BullMQ descarta el job por id repetido.
jobId: `booking-${booking.id}-${type}`
```

`type` tiene que ir en la clave: una misma reserva genera `pending`, `approved` y `cancelled`, y
son mails distintos que **sí** deben salir todos.

Puntos a resolver al implementar:

- **La ventana de dedup es la retención.** BullMQ solo puede descartar un `jobId` repetido mientras
  el job siga en Redis. Con el `removeOnComplete` de TD-01, pasado ese umbral el mismo id vuelve a
  entrar. Hay que verificar que la retención elegida cubra el caso real y dejar anotado el límite.
- **Los reintentos internos de un job no se ven afectados**: `attempts` reintenta *ese* job, no
  encola uno nuevo. La dedup protege contra el **doble encolado**, no contra el doble envío dentro
  del mismo job.

> Esa distinción es la parte que más enseña del ticket y la más fácil de pasar por alto: `jobId`
> resuelve el productor. Hacer el **efecto** idempotente (que Resend no mande dos veces) sería otro
> problema, y queda fuera.

## Criterio de aceptación

- [ ] Encolar dos veces el mismo evento de reserva produce **un** job, no dos.
- [ ] `pending`, `approved` y `cancelled` de la misma reserva conviven como jobs distintos.
- [ ] Queda documentado en el propio código o en `BULLMQ_QUEUES.md` que la ventana de dedup está
      atada a `removeOnComplete`.

## Fuera de alcance

- Idempotencia del **efecto** (dedup del lado de Resend, tabla de mails enviados). Es otro nivel del
  problema y a esta escala no se justifica.
- Idempotencia de la cola `notifications`. Escribe en Mongo, no manda mail; el costo de un duplicado
  es una notificación repetida en la campana. Evaluar recién si molesta.
