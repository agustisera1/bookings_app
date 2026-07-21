# TD-04 — Índice único `chats.booking_id` (y dónde viven los índices de Mongo)

| | |
|---|---|
| **Branch** | `fix/chats-unique-index` |
| **Bloque** | Índices |
| **Prioridad** | 🔴 Alta |
| **Esfuerzo** | ~1-2 h |
| **Depende de** | — |
| **Origen** | [`tech_debt/CHAT_FEATURE_NEXT_STEPS.md`](../tech_debt/CHAT_FEATURE_NEXT_STEPS.md) § El upsert todavía puede duplicar |
| **Repos** | `bookings_app` (+ verificación en `bookings-app-worker`) |

## Problema

**Dos problemas, uno adentro del otro.**

### 1. El upsert puede duplicar

`upsertChatByBookingId` (`bookings-app-worker/src/mongo/chats.mongo.ts`) usa
`updateOne(filter, { $setOnInsert }, { upsert: true })`. Eso **achica** la ventana de carrera que
tenía el find-then-insert anterior, pero no la cierra: MongoDB solo garantiza la atomicidad de un
upsert **si un índice único cubre el filtro**, y `chats.booking_id` no tiene ninguno. Dos mensajes
simultáneos sobre una reserva sin chat pueden insertar dos documentos.

Con dos chats para la misma reserva, `findChatByBookingId` devuelve uno arbitrario y `started_at`
deja de ser estable.

El código ya documenta la limitación en su propio JSDoc — falta el índice.

### 2. No hay ningún lugar donde vivan los índices de Mongo

El proyecto tiene migraciones versionadas para Postgres (`db/migrations/`, con `pnpm db:migrate`)
y **nada equivalente para Mongo**. Los dos índices que existen están sueltos dentro de scripts de
seed:

- `scripts/seed_listings.js:289` → text index sobre `title`/`description`
- `scripts/seed_notifications.js:98` → `{ target_id: 1, is_read: 1 }`

O sea: los índices se crean solo si corrés el seed, mezclados con datos de prueba. Un ambiente que
no sembró datos no tiene índices y nadie se entera.

## Por qué entra

Pasa por los **dos** criterios.

- **Aprendizaje:** "el upsert de Mongo es atómico" es una media verdad muy citada, y acá se ve la
  condición que casi nadie menciona. Es un caso concreto de índice que **no** existe por
  performance sino como **garantía de integridad** — la misma distinción que en Postgres separa un
  índice de una constraint.
- **Deploy:** la creación de índices no puede depender de correr un seed. Es la definición de un
  ambiente que se despliega distinto de como se desarrolla.

## Alcance

**Primero la decisión, después el índice.** Este ticket establece el mecanismo; TD-05 lo usa.

1. **Un lugar canónico para los índices de Mongo**, separado de los seeds. Propuesta:
   `scripts/mongo_indexes.js` + script `db:mongo-indexes` en `package.json`. Idempotente por
   naturaleza: `createIndex` sobre un índice existente es un no-op, así que se puede correr siempre.
2. **Mover ahí los dos índices que hoy viven en los seeds** (`listings`, `notifications`). Los seeds
   pasan a sembrar datos y nada más.
3. **Agregar el índice nuevo:**
   ```js
   db.chats.createIndex({ booking_id: 1 }, { unique: true });
   ```
4. **Tratar `E11000` como éxito** en `upsertChatByBookingId` (worker). Con el índice puesto, el
   upsert concurrente perdedor falla con duplicate key — y eso significa "ya existe", que es
   exactamente el resultado deseado. Sin este paso, el índice convierte una duplicación silenciosa
   en un error visible al usuario.
5. **Verificar que no haya duplicados previos** antes de crear el índice: si los hay, `createIndex`
   falla. Un `aggregate` con `$group` por `booking_id` lo confirma.

> El paso 4 es el que hace que el ticket sea un fix y no un cambio de síntoma.

## Criterio de aceptación

- [ ] Existe un script de índices independiente del seed, documentado en el README o en `CLAUDE.md`.
- [ ] Los índices de `listings` y `notifications` ya no se crean desde los seeds.
- [ ] `db.chats.getIndexes()` muestra el índice único sobre `booking_id`.
- [ ] Insertar dos chats con el mismo `booking_id` a mano falla con `E11000`.
- [ ] Enviar el primer mensaje de una reserva sigue funcionando end-to-end, y el `E11000` de una
      carrera no llega al usuario.

## Fuera de alcance

- Índices de `messages` → **TD-05** (usa el mecanismo que crea este ticket).
- Un sistema de migraciones de Mongo con versionado y rollback. Para índices declarativos e
  idempotentes es sobreingeniería; si más adelante hace falta transformar documentos, se reevalúa.
- Crear el chat al confirmar la reserva en vez de al primer mensaje. Cambia cuándo nace el
  documento; este ticket solo garantiza que nazca uno solo.
