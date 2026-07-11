# Arquitectura de colas (BullMQ + Redis)

> **Este archivo es compartido entre dos repos** (la app de bookings y el worker).
> Mantené una copia idéntica en ambos. Si cambiás el contrato de un payload, actualizás
> este doc **y** las dos copias en el mismo cambio.

Guía para agregar un nuevo worker o job processor y que quede alineado de los dos lados.
Léela completa antes de escribir código de colas.

---

## Panorama

Dos procesos, un Redis en el medio:

```
┌─────────────────────────┐        Redis         ┌─────────────────────────┐
│  Producer (Next.js app)  │      (BullMQ)        │  Worker (proceso aparte) │
│                          │                      │                          │
│  service ──▶ Queue.add() │ ──── "emails" ────▶  │  Worker(queue).process() │
│             (encola job) │      cola nombrada   │   └─▶ router(processorKey)│
└─────────────────────────┘                      └─────────────────────────┘
```

- El **producer** (esta app) solo **encola**: nunca ejecuta el trabajo pesado (mandar mails, etc.).
- El **worker** (repo aparte) **consume** y ejecuta. Nunca importa nada del producer: los dos lados se
  hablan **solo** a través del payload JSON que viaja por la cola.
- Por eso el **payload es el contrato**. No hay tipos compartidos por import; se **replican a mano** en
  ambos repos (ver [Regla del contrato espejo](#regla-del-contrato-espejo)).

---

## Reglas del payload (no negociables)

Un payload cruza un boundary de proceso y se **serializa a JSON** en Redis. Por lo tanto:

1. **Mínimo.** Solo los campos que el consumer realmente usa. Nada de filas de DB completas ni
   documentos enteros “por las dudas”.
2. **Sin secretos ni PII de más.** Jamás `password_hash`, tokens, ni el `User` completo. Si necesitás el
   host, mandá `{ name }`, no el row.
3. **JSON-safe.** Nada de `Date`, `ObjectId`, `Buffer`, clases. **Las fechas van como ISO string**
   (`new Date(x).toISOString()`), porque es lo único que sobrevive el transporte de forma honesta.
4. **Autodescriptivo.** El payload trae `processorKey` (ver abajo) para que el worker sepa qué hacer sin
   inspeccionar el resto.
5. **Un tipo, un mapper.** El producer define el `type ...Payload` **y** una función pura
   `to...Payload(...)` que hace el narrowing desde el dominio. El narrowing vive en un solo lugar.

---

## Convenciones

### Conexión a Redis

Ambos lados leen la conexión de las mismas env vars:

| Var | |
|-----|-|
| `REDIS_HOST` | host |
| `REDIS_PORT` | puerto |
| `REDIS_USER` | usuario |
| `REDIS_PASSWORD` | password |

En el producer, `getConnectionParams()` (en `lib/events.ts`) valida que estén todas y tira si falta alguna.
El worker replica el mismo helper.

### Nombres de cola

- Una cola = una **familia de trabajo**, no un job puntual. Ej: `"emails"` agrupa todos los mails
  (booking pending, booking accepted, review recibida…).
- El string del nombre de cola es literal y **tiene que ser idéntico** en `new Queue("emails")` (producer)
  y `new Worker("emails")` (worker).

### `processorKey` — ruteo dentro de una cola

Una cola transporta **varios tipos de job**. El discriminante es `processorKey` dentro del payload; el
worker rutea con un switch sobre ese campo. El nombre de job de BullMQ (`queue.add(name, data)`)
**no** se usa para rutear hoy — el ruteo es siempre por `processorKey`.

`processorKey` se tipa como **literal** (`"notify-booking"`), no como `string`, para que el switch del
worker sea exhaustivo y TypeScript avise si falta un caso.

---

## Cómo se ve hoy (referencia canónica: email de reserva)

### Producer — `lib/events.ts`

```ts
export const emailQueue = new Queue("emails", { connection: getConnectionParams() });

// El contrato: mínimo, JSON-safe, sin secretos.
export type BookingEmailPayload = {
  processorKey: "notify-booking";
  guest: { email: string };
  booking: { id: string; checkIn: string; checkOut: string; guests: number; totalPrice: number };
  host: { name: string };
  listing: { title: string; location: { address?: string; city?: string; country?: string } };
};

// El mapper puro: único lugar que decide qué campos van al email.
export function toBookingEmailPayload(input: { ... }): BookingEmailPayload { ... }
```

### Producer — `lib/services/bookings.ts`

```ts
// El service junta el dominio, guarda contra datos faltantes y encola el payload narrowed.
async function emailBookingDetails(bookingDetails: EmailBookingParams): Promise<ServiceResult<Job>> {
  const { guestEmail, booking, host, listing } = bookingDetails;
  if (!host || !listing) { /* log + return NOT_FOUND: no encolar un job roto */ }
  try {
    const job = await emailQueue.add("emails", toBookingEmailPayload({ guestEmail, booking, host, listing }));
    return { ok: true, data: job };
  } catch (error) { /* log + ServiceResult UNEXPECTED */ }
}
```

### Worker (repo aparte)

```ts
const worker = new Worker("emails", async (job) => router(job), { connection });

// Rutea por processorKey.
function router(job: Job) {
  switch (job.data.processorKey) {
    case "notify-booking": return notifyBooking(job);
    // nuevos casos acá
    default: console.error("[worker]: unknown processorKey", job.data.processorKey);
  }
}

async function notifyBooking(job: Job) {
  const payload = job.data as BookingEmailPayload; // type replicado en este repo
  await resend.emails.send({ to: [payload.guest.email], html: bookingEmailHtml(payload), ... });
}
```

---

## Agregar un nuevo job processor

Tomá una decisión primero: **¿entra en una cola existente o necesita una nueva?**
Misma familia de trabajo (otro tipo de mail) → cola existente, nuevo `processorKey`.
Familia distinta con distinto perfil de retry/concurrencia (ej. sync a Elasticsearch) → cola nueva.

### En el producer (esta app)

1. **Definí el contrato** en `lib/events.ts`: `type XxxPayload` con `processorKey: "xxx"` literal,
   mínimo y JSON-safe (fechas ISO).
2. **Definí el mapper** `toXxxPayload(input): XxxPayload` — puro, sin I/O, único lugar de narrowing.
3. **Cola:** reusá la existente (`emailQueue`) o creá `export const xxxQueue = new Queue("xxx", { connection: getConnectionParams() })`.
4. **Encolá desde el service** (`lib/services/*`), no desde el componente/route. Seguí el patrón de
   `emailBookingDetails`: guardar contra datos faltantes → `queue.add(name, toXxxPayload(...))` dentro de
   try/catch → devolver `ServiceResult`. El encolado es fire-and-forget respecto del happy path.
5. **`tsc` + `lint`** verde.

### En el worker (repo aparte)

1. **Replicá el `type XxxPayload`** exactamente igual (copiá el bloque de `lib/events.ts`).
2. **Nuevo processor** `async function processXxx(job)`: castea `job.data as XxxPayload` y hace el trabajo.
   Loguea éxito/error, no tires sin capturar (dejá que BullMQ maneje el retry si corresponde).
3. **Registrá el caso** en el `switch (processorKey)` del router de la cola.
4. Si es cola nueva: nuevo `new Worker("xxx", ...)` con la misma conexión.
5. **`tsc`** verde y el email/efecto renderiza/ocurre igual.

---

## Regla del contrato espejo

Los `*Payload` existen **duplicados a propósito** en los dos repos (no hay paquete compartido). Cuando
cambie un contrato:

- [ ] Actualizar `type` **y** mapper en el producer (`lib/events.ts`).
- [ ] Actualizar el `type` replicado en el worker.
- [ ] Actualizar este doc si cambió una convención.
- [ ] `tsc` verde en **ambos** repos.

Al agregar/quitar un campo, pensá la compatibilidad: si hay jobs viejos encolados en Redis, el worker
nuevo tiene que tolerar payloads sin el campo nuevo (campos opcionales o defaults).

---

## Checklist rápido

**Payload:** mínimo · JSON-safe · fechas ISO · sin secretos · `processorKey` literal · un tipo + un mapper.
**Producer:** contrato en `lib/events.ts` · encolar desde el service con guard + try/catch.
**Worker:** type replicado · processor + caso en el router · sin secretos que loguear.
