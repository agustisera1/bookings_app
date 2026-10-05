# Auditoría — Services (dimensión 2)

Alcance: los 7 services (`auth`, `bookings`, `chat`, `listings`, `notifications`, `reviews`, `users`), sus repos, sus tipos y `lib/apollo`. Criterio: `.claude/rules/02-services.md` (ejemplo canónico + checklist de auditoría). Se leyó cada service completo, como permite la excepción de `HOW_TO_ADD_RULE.md`.

## Resumen por service

| Regla | auth | bookings | chat | listings | notifications | reviews | users |
|---|---|---|---|---|---|---|---|
| Vive en `lib/<service>/`, un archivo por rol | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Tipos derivados de tabla / `z.infer` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Ningún tipo se re-exporta | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| La UI lee solo por GraphQL | n/a | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Solo `actions.ts` lleva `"use server"` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Input validado con zod antes de la DB | ✅ | ❌ | n/a | ❌ | n/a | ✅ | n/a |
| Revalidación con `revalidatePaths` | n/a | ❌ | n/a | ❌ | ❌ | ✅ | n/a |
| `catch`: `UNEXPECTED`, salvo `CONFLICT` | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Repository sin reglas de negocio | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

## A. Estructura y tipos

| # | Hallazgo | Dónde |
|---|---|---|
| 1 | Seis services siguen repartidos por capa técnica (`lib/services/`, `lib/repositories/`, `lib/types/`) | `auth`, `bookings`, `chat`, `listings`, `notifications`, `users` |
| 2 | Repos de Postgres con SQL a mano en vez de Drizzle (las tablas ya existen en `tables.ts`) | `repositories/bookings.pg.ts`, `repositories/users.pg.ts` |
| 3 | Tipos de entidad escritos a mano en vez de derivados de la tabla | `types/booking.ts` (`Booking`), `types/user.ts` (`User`) |
| 4 | Re-exports de tipos desde el service | `services/auth.ts`, `bookings.ts`, `listings.ts`, `notifications.ts`, `users.ts` |
| 5 | El tipo de retorno del service depende del repo (`Awaited<ReturnType<typeof repo.x>>`) | `bookings.getUserBookings`, `listings.getListing`, `getListings`, `getListingsByIds` |
| 6 | Un service importa de otro service (y no de sus `types`) | `services/listings.ts` → `Booking` de `./bookings` |
| 7 | El service depende de capas de afuera: un tipo de UI y los tipos generados de GraphQL | `services/listings.ts` → `Matcher` de `react-day-picker`, `FiltersInput` de `apollo/__generated__` |
| 8 | Tipos de otro service viven en el archivo equivocado | `types/booking.ts` → `ChatParties`; `types/chat.ts` usa `GuestBooking` |
| 9 | La validación vive fuera del service | `lib/validation/auth.ts` |

## B. Lecturas y escrituras

| # | Hallazgo | Dónde |
|---|---|---|
| 10 | Lecturas llamadas directo desde páginas y componentes, sin pasar por GraphQL | `listings.getListingAvailability` y `getListingBookings` (`listings/[id]/page.tsx`); `chat.getUserConversations` (`conversation-rail.tsx`), `getChatHistory` (`use-booking-chat.ts`), `getUnreadMessagesCount` (`(app)/layout.tsx`); `notifications.getUserNotifications` (`notifications/page.tsx`), `getNotificationsCount` (`(app)/layout.tsx`) |
| 11 | Lecturas exportadas desde archivos `"use server"`: quedan expuestas como Server Actions públicas | todas las lecturas de `auth`, `bookings`, `chat`, `listings`, `notifications`, `users` |
| 12 | Una lectura vive en el service equivocado (bookings de un listing, en `listings`) | `listings.getListingBookings` |

## C. Flujo de actions y queries

| # | Hallazgo | Dónde |
|---|---|---|
| 13 | Lecturas sin `authorize` | `listings.getListing`, `getListings` (`// TODO: Check for user authentication`), `getListingsByIds`; `users.getUserSummary` |
| 14 | Escrituras sin validación de input con zod | `bookings.createBooking`, `cancelBooking` (`reason`), `acceptBooking`/`rejectBooking` (`hostMessage`); `listings.createListing`, `editListing` |
| 15 | `revalidatePath` directo en vez de `revalidatePaths` | `bookings` (cancel, accept, reject), `listings` (create, delete, edit, remove photo), `notifications.markAsRead` |
| 16 | `pgErrorToCode` en un `catch` sin rama `CONFLICT`: un error de la DB sale con un código de dominio que no corresponde | `bookings.cancelBooking`, `acceptBooking`, `rejectBooking` |
| 17 | Error inesperado reportado como `NOT_FOUND` | `listings.getListingBookings` |
| 18 | `console.error` sin el `[fn]` | `listings.getListingAvailability` |
| 19 | Booking inexistente reportado como `VALIDATION`, distinto de "no sos parte" (`FORBIDDEN`): confirma qué bookings existen | `chat.getChatHistory` |

## D. Repository

| # | Hallazgo | Dónde |
|---|---|---|
| 20 | El repo decide qué estados liberan un slot (`status NOT IN ('cancelled', 'rejected')`): es una regla de `bookings/policy.ts` | `bookings.pg.ts` → `findBookedListingIds` |
