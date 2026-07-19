# Feature de notificaciones (BullMQ) — análisis de estado y próximos pasos

> Contexto: se unificaron los 4 mails de reserva (`pending` / `approved` / `rejected` /
> `updated`) en un solo `processorKey: "notify-booking"` discriminado por `type`. El
> cableado de dominio quedó completo; lo que sigue es la capa de **confiabilidad de entrega**.

---

## Veredicto: la arquitectura quedó decente; la **entrega** todavía no es de producción

No es una implementación pobre — el refactor dejó el diseño limpio y correcto. Pero tiene un
bloqueante real para un deploy "de verdad".

---

## Lo que está sólido ✅

- **Separación de capas correcta**: UI → service → repo → cola, y el worker desacoplado. Si el
  worker se cae, `accept`/`reject` **no fallan** — el job queda en Redis y se entrega cuando
  vuelve. Eso es exactamente lo que querés de async (RNF-04).
- **Contrato del payload sano**: mínimo, JSON-safe, sin secretos ni PII de más. Un `processorKey`
  + `type`, mapper único. DRY y cohesivo.
- **Fire-and-forget bien hecho**: la notificación nunca tumba la mutación de negocio.
- **El dispatcher re-lanza correctamente**: `createProcessor` (`src/processors/dispatch.ts`) loguea
  y vuelve a lanzar, así que BullMQ marca el job como fallido.

---

## 🔴 Bloqueante para deploy real — **TD-01**

**Los fallos de envío se tragan → no hay reintentos.**

El agujero está un nivel por debajo del dispatcher:

```ts
// src/processors/email.ts — notifyBooking
const { data, error } = await resend.emails.send({ ... });

if (data) console.info("[notifyBooking]: booking notification sent");
if (error) {
  console.error("[notifyBooking]: could not send booking notification");
  console.error(error);   // ← se loguea y la función resuelve OK
}
```

El SDK de Resend **no lanza** ante un fallo: devuelve `{ data, error }`. Como `notifyBooking` solo
loguea, la promesa resuelve, el dispatcher no tiene nada que re-lanzar, y BullMQ marca el job
*completed*. Un timeout o un rate limit queda como una línea de log.

`greetUser` es peor en la misma dirección: hace `await resend.emails.send(...)` y **descarta el
resultado entero** — ni siquiera loguea.

A eso se suma que las colas se declaran sin política de reintentos ni limpieza:

```ts
// bookings_app/lib/events.ts
export const emailQueue = new Queue("emails", { connection });   // sin defaultJobOptions
```

Sin `removeOnComplete`/`removeOnFail`, además, Redis crece sin techo en un deploy largo.

Neto: el sistema es *at-most-once*, y ante cualquier hipo de Resend es *zero*.

> El valor de una cola es la garantía *at-least-once*. Un handler que no lanza es un job que no
> reintenta — con el error tragado, BullMQ es un `setTimeout` caro.

---

## 🟡 Sin idempotencia — **TD-02**

BullMQ es *at-least-once*; el día que se activen los reintentos, un retry puede **duplicar** el
mail. No hay dedup por `jobId`/booking.

Es la mitad que le falta a TD-01: activar reintentos sin idempotencia es cambiar "pierdo mails" por
"mando mails de más".

---

## Recordatorio de runtime (para probar la entrega end-to-end)

1. **Worker corriendo**: `pnpm dev` en `bookings-app-worker`.
2. **`DEV_MODE=1`** en el `.env` del worker → manda todo a la casilla de dev en vez de al guest
   real (todavía no está en `.env.example` del worker; conviene agregarlo).
3. **`RESEND_API_KEY`** válida en el worker.
4. **Mismo Redis de los dos lados.** Ojo: el producer lee `REDIS_HOST/PORT/USER/PASSWORD` y el
   worker lee `REDIS_URL` — dos esquemas para la misma conexión, fácil de desincronizar.

Recordá también: el destinatario real es el **guest** de la reserva, no el host que acepta/rechaza
(salvo en `DEV_MODE=1`).

`from` sale de `EMAIL_FROM`, con el sandbox de Resend (`onboarding@resend.dev`) como default de dev.
Esa dirección solo entrega a tu propia casilla verificada: enviar a guests reales requiere un
dominio verificado en Resend.
