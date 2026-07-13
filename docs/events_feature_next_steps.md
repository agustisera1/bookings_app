# Feature de notificaciones (BullMQ) — análisis de estado y próximos pasos

> Estado al cerrar la sesión anterior. Retomar desde acá.
> Contexto: se unificaron los 4 mails de reserva (`pending` / `approved` / `rejected` /
> `updated`) en un solo `processorKey: "notify-booking"` discriminado por `type`. El
> cableado de dominio quedó completo; lo que sigue es la capa de **confiabilidad de entrega**.

---

## Veredicto: la arquitectura quedó decente; la **entrega** todavía no es de producción

No es una implementación pobre — el refactor dejó el diseño limpio y correcto. Pero tiene
**2 bloqueantes reales** para un deploy "de verdad" y algunas fallas de robustez. Para un
proyecto de aprendizaje o un deploy de bajo riesgo, alcanza. Para un producto donde perder un
mail de "reserva rechazada" importa, **todavía no**.

Lo que define casi todo el veredicto (capa de confiabilidad, lo que faltaba mirar):

- `emailQueue = new Queue("emails", { connection })` — **sin `defaultJobOptions`** (ni
  `attempts`, ni `backoff`, ni `removeOnComplete`).
- `new Worker("emails", emailsProcessor, { connection })` — sin config de reintentos.
- `emailsProcessor` hace `try/catch` y **solo loguea** el error → la promesa **resuelve OK** →
  BullMQ marca el job como *completed* aunque el mail haya fallado.

---

## Lo que está sólido ✅

- **Separación de capas correcta**: UI → service → repo → cola, y el worker desacoplado. Si el
  worker se cae, `accept`/`reject` **no fallan** — el job queda en Redis y se entrega cuando
  vuelve. Eso es exactamente lo que querés de async (RNF-04).
- **Contrato del payload sano**: mínimo, JSON-safe, sin secretos ni PII de más. Un `processorKey`
  + `type`, mapper único. DRY y cohesivo.
- **Fire-and-forget bien hecho**: la notificación nunca tumba la mutación de negocio.

---

## Bloqueantes para deploy real 🔴

1. **Los fallos se tragan silenciosamente → no hay reintentos.** Como `emailsProcessor` captura y
   loguea, un fallo transitorio de Resend (timeout, rate limit) marca el job como exitoso y **el
   mail se pierde para siempre**. Ni siquiera poniendo `attempts` se arreglaría, porque el error
   nunca se propaga. Este es el más grave: hoy es efectivamente *at-most-once*, y a menudo *zero*
   ante cualquier hipo.

2. **`from: "onboarding@resend.dev"` hardcodeado.** Con esa dirección, Resend **solo** deja enviar
   a tu propio email verificado. En prod, a un guest real, lo rechaza hasta que verifiques un
   dominio. O sea: sin dominio configurado, el feature literalmente no entrega a huéspedes reales.

---

## Fallas de robustez (no bloquean, pero suman deuda) 🟡

- **Sin idempotencia.** BullMQ es *at-least-once*; el día que actives reintentos, un retry puede
  **duplicar** el mail. No hay dedup por `jobId`/booking.
- **Jobs nunca se limpian** (`removeOnComplete`/`removeOnFail` ausentes) → Redis crece sin techo en
  un deploy largo.
- **Config de Redis divergente**: producer lee `REDIS_HOST/PORT/USER/PASSWORD`, worker lee
  `REDIS_URL`. Dos fuentes de verdad para la misma conexión = frágil y fácil de desincronizar entre
  entornos.
- **Observabilidad = `console.log`.** Sin structured logging ni métricas, un mail perdido es
  invisible. (Aceptable: es material de Fase 6.)
- **Sin tests** del flujo.

---

## Qué lo llevaría de "aceptable" a "decente para deployear"

Ordenado por retorno, lo mínimo serían los dos primeros:

1. **Dejar que el worker falle cuando falla**: en `notifyBooking`, si `resend` devuelve `error`,
   `throw` (no solo loguear) — y en `emailsProcessor` re-lanzar en vez de tragarlo. Ahí sí BullMQ
   reintenta.
2. **Config de reintentos** en la cola:
   `defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 }`.
3. **Dominio verificado en Resend** + `from` por env var (no hardcodeado).
4. Unificar la conexión de Redis a un solo esquema en ambos repos.
5. (Más adelante) idempotencia por `jobId` y algo de observabilidad.

Con **1–3** hechos, esto es deployable para un uso real de bajo/medio volumen. Sin el punto 1, no
conviene deployarlo a algo que importe, porque estás confiando en "casi nunca falla Resend", y
cuando falle no te vas a enterar.

**Puntos 1 y 2 dependen solo de código** (acotados a `lib/events.ts` + el worker), sin config
externa — buen punto de arranque para mañana. Los puntos 3 y 4 requieren config/infra.

---

## Recordatorio de runtime (para probar la entrega end-to-end)

Independiente de lo anterior, para que un mail llegue durante las pruebas:

1. **Worker corriendo**: `pnpm dev` en `bookings-app-worker`.
2. **`DEV_MODE=1`** en el `.env` del worker → manda todo a la casilla de dev en vez de al guest
   real (todavía no está en `.env.example` del worker; conviene agregarlo).
3. **`RESEND_API_KEY`** válida en el worker.
4. **Mismo Redis de los dos lados** (ojo con el esquema divergente del punto 4 de arriba).

Recordá también: el destinatario real es el **guest** de la reserva, no el host que acepta/rechaza
(salvo en `DEV_MODE=1`, que redirige todo a la casilla de dev).
