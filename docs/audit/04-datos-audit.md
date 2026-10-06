# Auditoría — Datos / persistencia (dimensión 4)

**Alcance:** lo que tocan los flujos 1–3 de [scope.md](scope.md):
- Postgres: `users`, `bookings`, `outbox`, `processed_events`.
- Mongo: `chats`, `messages`, `read_cursors`, `notifications`; `listings` solo en lectura.
- Las consultas de `lib/*/repository.ts` sobre esas tablas y las del worker (`greenaway-worker/src/pg`, `src/mongo`, `src/redis/socket.ts`).

**Criterio:** `.claude/rules/04-datos.md`. **Verificación:** lectura de código, sin correr la app. Un
índice creado a mano en una base local no cuenta: se audita lo que está en el repo.

## Resumen

| Criterio | Veredicto | Hallazgos |
|---|---|---|
| D1 Índice justificado por el costo | ❌ | 1–3 |
| D2 Ningún índice sobra | ✅ | |
| D3 Invariantes en la base | ❌ rangos de `bookings` | 4 |
| D4 Schema en el repo, idempotente, aparte del seed | ✅ Postgres; ❌ Mongo | 5 |
| D5 Tipo que modela el dato | ❌ fechas en Mongo | 6 |
| D6 Referencias entre bases | ✅ en el alcance | |
| P1 FK con índice | ✅ | |
| P2 Orden del compuesto | ✅ no hay compuestos B-tree en el alcance | |
| P3 Parcial con predicado inline | ✅ | |
| P4 Unicidad sobre lo normalizado | ❌ | 7 |
| P5 Retención | ❌ | 8 |
| M1 ESR | ✅ | |
| M2 Único en upsert y claim | ❌ | 9, 10 |
| M3 Único parcial | ✅ | |
| M4 Validator `$jsonSchema` | ❌ | 11 |
| M5 Referenciar lo que crece | ✅ | |

## Hallazgos

| # | Criterio | Hallazgo | Dónde |
|---|---|---|---|
| 1 | D1 | `messages` no tiene índices: abrir un chat, paginarlo y contar los no leídos recorre los mensajes de todos los chats. Falta `{ chat_id: 1, timestamp: -1 }` | `lib/chat/repository.ts` → `findMessagesByChatId`, `findOlderCursor`, `countMessagesSince` |
| 2 | D1 | `chats` no tiene índices: la lista de conversaciones recorre todos los chats. El `$or` necesita `{ guest_id: 1 }` y `{ host_id: 1 }` | `lib/chat/repository.ts` → `findChatIdsByUserId` |
| 3 | D1 | `listings` no tiene índice en `host_id`: las conversaciones de un host recorren todos los listings | `lib/chat/queries.ts` → `listingsRepo.findListings({ host_id })` |
| 4 | D3 | Los rangos de una reserva solo los valida zod: no hay `CHECK` para `guests >= 1`, `total_price >= 0`, `refund_amount` entre 0 y `total_price`, ni `end_date > start_date`. Una fecha invertida falla en `tstzrange` con un error genérico | `lib/bookings/tables.ts` |
| 5 | D4 | Los índices de Mongo no tienen lugar canónico: el text de `listings` y los dos de `notifications` (incluido el único de `event_id`) se crean en los seeds. No existe `db:indexes` | `scripts/seed_listings.js:289`, `scripts/seed_notifications.js:98-107` |
| 6 | D5 | Instantes guardados como string ISO; el orden y el cursor del chat dependen de que todo escritor use `toISOString()` | `messages.timestamp`, `chats.started_at` (`greenaway-worker/src/redis/socket.ts:91,98`); `read_cursors.last_seen_at` (`lib/chat/actions.ts:12`) |
| 7 | P4 | `unique_email` compara en bytes: el registro guarda el email con mayúsculas y el login busca exacto, así que `A@x.com` y `a@x.com` son dos cuentas | `lib/users/tables.ts`, `lib/auth/validation.ts` |
| 8 | P5 | `outbox` y `processed_events` no tienen retención: las filas publicadas y procesadas no se borran nunca | `lib/outbox/tables.ts` |
| 9 | M2 | El upsert de un chat filtra por `booking_id` sin índice único: dos primeros mensajes concurrentes crean dos chats | `greenaway-worker/src/mongo/chats.mongo.ts` → `upsertChatByBookingId` |
| 10 | M2 | El upsert del cursor de lectura filtra por `user_id` sin índice único | `lib/chat/repository.ts` → `upsertReadCursor` |
| 11 | M4 | Ninguna colección del alcance tiene validator | `chats`, `messages`, `read_cursors`, `notifications` |

## Fuera de alcance

- Búsqueda y filtros: el text index de `listings`, `bookings_daterange_gist` y `findBookedListingIds`.
- `reviews`: sin `booking_id` ni `author_id`.
- Alta y edición de listings: el validator de `listings` y `deleteListing`, que deja reservas huérfanas (D6).

## Bugs encontrados

- `scripts/reset_data.ts`: `TRUNCATE outbox` falla por la FK de `processed_events`, y no limpia `read_cursors`. Resuelto: ver abajo.

## Resolución

Resueltos en `refactor/data` (este repo y `greenaway-worker`). 8 y 11 quedan como deuda en
`docs/tech-debt/data-next-steps.md`.

| # | Cómo se resolvió |
|---|---|
| 1–3, 9, 10 | Índices en `scripts/db_indexes.ts`: `messages {chat_id, timestamp}`, `chats` por `guest_id` y `host_id` y único por `booking_id`, `listings.host_id`, `read_cursors` único por `user_id` |
| 4 | `CHECK` de fechas, huéspedes, precio y reembolso en `bookings` (migración `0005`) |
| 5 | `pnpm db:indexes` es el único lugar de los índices de Mongo; `pnpm db:setup` corre migraciones + índices. Los seeds de `mongosh` se reemplazaron por `pnpm db:seed` (`scripts/seed.ts`), que solo inserta |
| 6 | `messages.timestamp`, `chats.started_at` y `read_cursors.last_seen_at` son `Date` en la app y el worker; por el socket el timestamp viaja en ISO |
| 7 | El email se guarda y se busca en minúsculas (zod) y `CHECK users_email_lowercase` lo garantiza; `0004` normaliza los existentes |
| Bug de `db:reset` | `processed_events` entra en el mismo `TRUNCATE` que `outbox`, y `read_cursors` en las colecciones que limpia |
