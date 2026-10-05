# Convenciones de código (transversales)

> **Desactualizada.** Describe el estado previo a la auditoría de esta dimensión y puede contradecir el código. Ante una diferencia, mandan el código y las reglas ya auditadas (`02-services.md`, `07-frontend.md`).

## Librería compartida — `/lib`

Antes de escribir cualquier utilidad, formatter o constante en un componente, **verificar si ya existe en `/lib`**. Si no existe y es reutilizable, agregarla ahí. No duplicar lógica.

| Archivo | Qué contiene |
|---------|-------------|
| `lib/utils.ts` | `cn` (classnames), `formatPrice`, `humanize`, `initialsFrom`, `bookingStatusVariant`, `listingTypeGradient` |
| `lib/dates.ts` | `parseTs`, `formatDate`, `calcNights`, `datePickerTriggerClass` |
| `lib/types/index.ts` | Tipos compartidos (`ServiceResult`, etc.) |
| `lib/services/*` | Lógica de negocio server-side (siempre retornan `ServiceResult`) |
| `lib/bookings/policy.ts` | Reglas puras del ciclo de vida de una reserva: transiciones legales, `canCancel`, `refundFor`, `isCompleted` |
| `lib/apollo/*` | Cliente Apollo, resolvers, schema, tipos generados |
| `lib/postgres.ts` | Cliente PostgreSQL y helpers de error |
| `lib/mongo.ts` | Cliente MongoDB |
| `lib/permissions.ts` | Roles, permisos y helpers de autorización |
| `lib/jwt.ts` | Sign/verify de tokens |
| `lib/authorize.ts` | `authorize(permission)` — gate de identidad y permisos (usa `getCurrentUser`) |
| `lib/redis.ts` | Cliente de comandos Redis singleton (`getRedisClient`) |
| `lib/redis-config.ts` | `getRedisConnectionParams` — params de conexión Redis validados (SSE, cota) |
| `lib/rate-limit.ts` | `rateLimit(key, policy)` / `resetRateLimit` — cota de abuso sobre Redis |
| `lib/subscriber.ts` | `getSubscriber` — suscriptor Redis del fan-out SSE de notificaciones |
| `lib/socket.ts` | Cliente socket.io del chat + contrato `EVENTS` y sus tipos |
| `lib/s3.ts` | Cliente S3 y helpers de fotos (`addListingObject`, `deleteListingObject`) |
| `lib/images.ts` | `normalizeListingPhoto` — transforma la foto subida con sharp (rotate EXIF, resize, WebP) antes de S3. Server-only: importa sharp, nunca desde un Client Component |
| `lib/listings.ts` | Constantes de listings (`PROPERTY_TYPES`, `AMENITIES`, restricciones de foto) y `parseListingFilters` |
| `lib/http.ts` | `toHttpResponse` — mapea `ServiceResult` a respuesta HTTP |
| `lib/request.ts` | `getClientIp` — IP del request (para la cota) |

### Regla DRY

- **Formatters de fecha** (`formatDate`, `calcNights`, `parseTs`) → siempre de `lib/dates.ts`
- **Formatters de precio** (`formatPrice`) → siempre de `lib/utils.ts`
- **Variantes de badge por status** (`bookingStatusVariant`) → siempre de `lib/utils.ts`
- **Tipos de dominio** → siempre de `lib/types/index.ts` o del service correspondiente
- Si una función aparece en más de un componente → moverla a `/lib` antes de copiarla

### Regla de cohesión y acoplamiento

**Siempre que se agregue código, evaluar los agregados desde la perspectiva de alta cohesión y bajo acoplamiento.** Antes de dar por cerrado un cambio, preguntarse:

- **Cohesión:** ¿las piezas que agregué que se referencian entre sí viven juntas? Un conjunto que forma una unidad conceptual (p. ej. un tipo + sus transiciones + sus defaults + sus derivados) debería estar en un mismo lugar, no disperso.
- **Acoplamiento:** ¿estoy mezclando cosas con dependencias distintas? Lógica pura (sin React, sin DB, sin framework) no debería quedar enredada con rendering o I/O. Si una parte no depende de React y la otra es toda React, separarlas baja el acoplamiento y sube la testeabilidad.
- **Dónde ubicarlo:** dominio/utils general → `/lib`; estado o lógica pura específica de una feature → módulo colocado al lado del componente (`.ts` sin `"use client"`), importado de vuelta por el componente. Ref: `components/search/filters-draft.ts` (modelo puro del draft) consumido por `components/search/use-filters.ts` (el hook con el `useReducer`); `components/search/filters.tsx` es el orquestador que compone el render.

Esta evaluación es parte de "terminar" un cambio, igual que pasar `tsc`/`lint`.

### Regla de tipos — revisar SIEMPRE antes de escribir uno nuevo

**Antes de declarar cualquier `type`/`interface` nuevo — sea para una feature o un ajuste — revisar primero las bibliotecas de tipos existentes y reutilizar/derivar en vez de re-inlinear.** Escribir un tipo desde cero es la última opción, no la primera. Esta verificación es obligatoria y precede a escribir el tipo, igual que buscar en `/lib` antes de escribir una utilidad.

**Dónde buscar antes (en este orden):**

| Fuente | Qué vive ahí | Ejemplos |
|--------|--------------|----------|
| `lib/types/*` | Tipos de dominio (entidades, `ServiceResult`, `ErrorCode`) y el contrato del outbox | `User`, `Booking`, `OutboxEvent` |
| El service correspondiente | Tipos de parámetros y re-exports del dominio | `CreateBookingParams` |
| `__generated__/resolvers-types.ts` / `operations.ts` | Tipos de schema/inputs y de operaciones GraphQL | `FiltersInput`, `GetListingsQuery` |

**Cómo reutilizar en vez de duplicar:**

- Si un tipo nuevo comparte forma con uno existente, **derivarlo** con `Pick`/`Omit`/`Partial`/`&` o `ReturnType`, no re-escribir los campos a mano. Un sub-shape que ya existe (p. ej. `UpdateBookingFields`) se referencia, no se re-inlina.
- Si la misma forma aparece en más de un módulo → extraerla a su lugar canónico (`lib/types/*` si es dominio; al lado del componente si es estado de feature) **antes** de copiarla. Es la regla DRY de `/lib` aplicada a los tipos.
- Un tipo va donde ya viven sus pares conceptuales (cohesión): dominio y contratos transversales → `lib/types/*`; params de un service → el propio service; estado puro de feature → módulo colocado junto al componente.

> **Anti-patrón concreto (a no repetir):** re-inlinear el mismo shape en tres lugares (el tipo, el input del mapper y el param del helper) en vez de definirlo una vez y derivar las variantes. Si estás por escribir una forma que "se parece" a otra, casi siempre corresponde derivar.

### Regla de comentarios — el default es no comentar

**El código se explica solo (casi siempre lo hace).** Se comenta solo lo que no es deducible leyendo el código: un edge case no obvio, un valor de config elegido a propósito, o algo que parece un error y no lo es.

- **Límite duro: máx. 2 líneas por bloque.** Lo aplica el hook `.claude/hooks/check-comments.mjs`, que rechaza el edit que lo viola.
- **Comentario largo = nombre o estructura que falla:** arreglá eso primero. El rationale de una feature va a `docs/`; en el código, a lo sumo `// Ver docs/X.md`.
