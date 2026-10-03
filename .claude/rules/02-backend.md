---
paths:
  - "lib/services/**"
  - "lib/repositories/**"
  - "lib/types/**"
  - "app/api/**"
---

# Backend / servicios (dimensión 2)

## Arquitectura de `lib/`

### Capas y responsabilidades

```
components / app/          Entry points (Server Actions, GraphQL resolvers, route handlers)
      ↓
lib/services/              Lógica de negocio: auth, validación de permisos, reglas de dominio
      ↓
lib/repositories/          Acceso a datos: queries a una única DB, sin lógica de negocio
      ↓
lib/types/                 Tipos de dominio compartidos entre capas
```

Cada capa solo conoce a su vecina inmediata hacia abajo. Los componentes no importan de `repositories/`, los repositorios no importan de `services/`.

---

### `lib/types/` — Tipos de dominio

Tipos que representan entidades del negocio, independientes de la DB y del cliente.

| Archivo | Dominio (tipo ancla) |
|---------|----------------------|
| `index.ts` | Contratos transversales (`ServiceResult<T>`, `ErrorCode`) |
| `user.ts` | Usuario y sesión (`User`, `CurrentUser`) |
| `booking.ts` | Reserva (`Booking`) |
| `review.ts` | Reseña (`Review`) |
| `listing.ts` | Listado (`ListingDocumentValues`) |
| `notification.ts` | Notificación in-app (`NotificationDocument`) |
| `chat.ts` | Chat y conversaciones (`ChatDocument`, `Conversation`) |
| `messages.ts` | Mensaje (`MessageDocument`) |

> El tipo entre paréntesis es el ancla, no el inventario: el archivo es la fuente de verdad de su superficie completa. Esta tabla mapea **qué dominio vive en cada archivo**, no enumera sus tipos.

**Regla:** los services re-exportan los tipos que consumen para mantener compatibilidad hacia arriba (`export type { Booking } from "../types/booking"`). Los consumers pueden importar del service o del archivo de types — ambos son válidos.

---

### `lib/repositories/` — Acceso a datos

Una función por operación. El nombre del archivo indica la DB: `.pg.ts` para PostgreSQL, `.mongo.ts` para MongoDB.

| Archivo | Cubre |
|---------|-------|
| `users.pg.ts` | Usuarios: lookup por email, alta |
| `sessions.pg.ts` | Sesiones: validación, creación, rotación del refresh, revocación |
| `bookings.pg.ts` | Reservas: alta, queries por guest/listing, rangos de disponibilidad, update de estado |
| `reviews.pg.ts` | Reseñas: listado por listing, alta |
| `listings.mongo.ts` | Listados: lookup por id/ids, búsqueda con filtros |
| `notifications.mongo.ts` | Notificaciones in-app: listado, conteo, update |
| `chat.mongo.ts` | Chats: lookup del documento por booking |
| `messages.mongo.ts` | Mensajes: historial por chat |

> La firma exacta de cada función vive en el archivo — es la fuente de verdad. Esta tabla mapea **qué dominio cubre cada repo**, no enumera sus funciones (un inventario se desincroniza; un dominio no).

**Reglas:**
- Sin `"use server"`, sin `authorize()`, sin lógica de negocio
- Reciben y devuelven tipos de dominio (`lib/types/`), nunca tipos de DB crudos hacia afuera
- No tienen try/catch — los errores propagan al service que los llama

#### Los repositorios NO manejan lógica de negocio

Un repositorio expone **operaciones de datos genéricas**, no acciones de dominio. Traduce parámetros ↔ query y devuelve filas; no *decide* nada del negocio. La decisión ("marcar una notificación como leída", "rechazar una reserva") vive en el service; el repo solo ofrece el `update`/`insert`/`select` que esa decisión necesita.

**Qué es acceso a datos (va en el repo):**
- CRUD y queries parametrizadas; proyección de tipos de DB a dominio (p. ej. `_id: ObjectId` → `string`).
- **Scoping por ownership en el `WHERE`** (`... AND guest_id = $2`, `{ target_id: userId }`): es un predicado de query, patrón aceptado. Refs: `findBookingsByGuestId`, `updateNotification`.
- Atomicidad a nivel DB (CTEs, transacciones). Ref: `rotateSession`.

**Qué es lógica de negocio (NO va en el repo → va en el service):**
- Autorización (`authorize`), validación de reglas, orquestación de varias operaciones.
- **Codificar qué valores de dominio "cuentan"**: el conjunto de estados, umbrales o defaults que representan una regla del negocio. Si cambia la regla y hay que editar el repo, la regla estaba en el lugar equivocado.

**Convención de nombres — operación genérica, no acción de dominio:**

| ✅ Repo (genérico, orientado a datos) | ❌ Repo (acción de dominio disfrazada) |
|---|---|
| `updateNotification(id, userId, values: Partial<…>)` | `markAsRead(id)` |
| `updateBooking(id, values: Partial<…>)` | `rejectBooking(id)` / `acceptBooking(id)` |

El nombre de dominio (`markAsRead`, `rejectBooking`) es el del **service**, que delega en el `update*` genérico del repo pasando los `values` concretos. Modelo canónico: `notificationsService.markAsRead` → `notificationsRepo.updateNotification(id, userId, { is_read: true })`. El tipo de `values` se deriva del dominio con `Pick` (`UpdateBookingFields`, `UpdateNotificationFields`), nunca se re-inlinea.

> **Deuda técnica conocida (refactor futuro, no tocar sin pedirlo):** `bookings.pg.ts` → `findBookedListingIds` hardcodea en el `WHERE` los estados que liberan un slot (`status NOT IN ('cancelled', 'rejected')`). Ese conjunto es una regla de negocio (qué estados invalidan disponibilidad) filtrada dentro del repo. Refactor ideal: definir esos estados en el dominio/service y pasarlos como parámetro, o exponerlos como constante compartida. Hasta entonces, no replicar el patrón en repos nuevos.

---

### `lib/services/` — Lógica de negocio

Todos los services son `"use server"`. Cada función sigue este flujo:

```
1. authorize(permissionKey)   → verifica identidad y permisos
2. validación de negocio      → early return si aplica (sin throw)
3. try { repo calls }         → delega el acceso a datos al repositorio
   catch (error) {            → traduce errores de DB a mensajes friendly
     pgErrorToCode(error)
   }
```

**Regla de parámetros:** los services no importan tipos de componentes (`FormValues`). Reciben tipos planos (`{ checkIn: Date; guests: number; ... }`). Los componentes pasan sus form values que coinciden con esos shapes.

## Patrón de error handling en servicios

Todo service en `lib/services/*` devuelve `ServiceResult` (ver `lib/types/index.ts`). El manejo de errores sigue este esquema, que separa errores de negocio conocidos de errores inesperados del sistema.

### Regla fundamental

**Nunca reenviar `error.message` al cliente.** Los mensajes de error de PostgreSQL o de Node exponen detalles de implementación (nombres de constraints, columnas, tablas, stack traces). Solo los mensajes escritos explícitamente en el service llegan al cliente.

### Estructura obligatoria del catch

```ts
} catch (error) {
  const code = db.pgErrorToCode(error);

  // Errores de negocio conocidos: devolver mensaje friendly específico
  if (code === "CONFLICT") {
    return { ok: false, error: "Mensaje específico para el usuario", code };
  }

  // Error inesperado: loguear server-side, devolver genérico al cliente
  console.error("[nombreDeLaFuncion]", error);
  return { ok: false, error: "Could not complete the operation", code };
}
```

### Tabla de códigos PG → ErrorCode

| Código PG | Causa | `ErrorCode` | Acción en el catch |
|-----------|-------|-------------|-------------------|
| `23505` unique_violation | Email/campo único duplicado | `CONFLICT` | Devolver mensaje friendly |
| `23P01` exclusion_violation | Solapamiento de fechas (reservas) | `CONFLICT` | Devolver mensaje friendly |
| `23503` foreign_key_violation | FK referencia un registro inexistente | `NOT_FOUND` | Devolver mensaje friendly |
| `23502` not_null_violation | Campo requerido faltante | `VALIDATION` | Devolver mensaje friendly |
| `23514` check_violation | Valor fuera del rango permitido | `VALIDATION` | Devolver mensaje friendly |
| Cualquier otro | Error del sistema | `UNEXPECTED` | `console.error` + mensaje genérico |

### Errores de negocio fuera del try/catch

Los errores de lógica que se detectan **antes** de tocar la base de datos se devuelven directamente como `ServiceResult`, sin throw. El throw dentro de un try/catch es solo para hacer que el flujo caiga al catch; como manejamos el flujo con early returns, no es necesario.

```ts
// ✅ Correcto: early return, no throw
if (bookings.length === 0)
  return { ok: false, error: "You need a completed booking to leave a review", code: "FORBIDDEN" };

// ❌ Incorrecto: throw que cae al catch con error.message expuesto
throw new Error("No bookings found");
```

### Reglas adicionales

| Situación | Solución |
|-----------|----------|
| Error inesperado | `console.error("[fn]", error)` siempre antes del return |
| Formato del log | `"[nombreDeLaFuncion]"` entre corchetes |
| Mensaje al cliente en UNEXPECTED | Siempre genérico ("Could not …") — nunca `error.message` |
| Consumer (componente/route handler) | Mostrar `result.error` tal cual — ya es un string friendly |

### Consumer: manejo en formularios

```ts
async function onSubmit(data: FormValues) {
  const result = await myService(data);
  if (!result.ok) {
    toast.error(result.error);  // ya es friendly, se puede mostrar directo
    throw new Error(result.error);  // evita que RHF marque isSubmitSuccessful = true
  }
  // happy path
}
```
