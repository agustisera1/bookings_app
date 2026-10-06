---
paths:
  - "lib/*/tables.ts"
  - "lib/*/repository.ts"
  - "lib/infra/postgres.ts"
  - "lib/infra/mongo.ts"
  - "db/**"
  - "scripts/**"
  - "drizzle.config.ts"
---

# Datos / persistencia (dimensión 4)

Criterios para auditar el modelo de datos en PostgreSQL y MongoDB: índices, constraints, tipos y
dónde vive el schema. Las secciones de criterios no dependen del proyecto. Lo propio de este repo
está al final, en **En este repo**.

**Cómo se usa:** cada criterio es **Base** (se audita siempre) o **Condicional** (se audita solo si
se cumple su "Aplica cuando"). En el informe, un condicional que no aplica se lista con el motivo
concreto del proyecto.

**Cómo se mide un índice:** `EXPLAIN ANALYZE` en Postgres y `.explain("executionStats")` en Mongo,
sobre datos de volumen realista y después de `ANALYZE`. Con 20 filas el planner hace seq scan aunque
el índice exista: el veredicto sale de leer la consulta contra el índice, el plan lo confirma.
Ref: [PG 11.12][pg-examine].

---

## Común — las dos bases (Base)

- **D1. Un índice de performance se justifica por el costo que evita, no por existir la
  consulta.** Hace falta cuando, sin él, la consulta recorre **toda** la tabla (su costo crece con el
  total, no con lo que devuelve) y corre en un camino frecuente, como la carga de una pantalla. Si un
  índice existente ya reduce la consulta a un puñado de filas, ordenarlas en memoria no cuesta y no
  hace falta otro. Los índices de correctitud no entran acá: los cubren D3 y M2. Verificación: para
  cada consulta del alcance, nombrar qué recorre sin índice y si ese costo crece con el total.
  Ref: [PG 11.3][pg-multi] ("in most situations, an index on a single column is sufficient"),
  [Mongo — Indexing Strategies][mg-strat] (frecuencia de la consulta).

  ```js
  // messages.find({ chat_id }).sort({ timestamp: -1 }).limit(50)
  // ✅ { chat_id: 1, timestamp: -1 }: sin él recorre los mensajes de todos los chats

  // bookings WHERE guest_id = $1 ORDER BY start_date DESC LIMIT 20
  // ❌ (guest_id, start_date): (guest_id) ya deja las pocas reservas de un guest; ordenarlas es gratis
  ```

- **D2. Ningún índice sobra.** Cada índice tiene la justificación de D1 o respalda un constraint.
  Un índice que es prefijo de otro es redundante, y cada índice cuesta en cada escritura.
  Verificación: para cada índice, nombrar la consulta o el constraint que lo usa. Ref: [PG
  11.3][pg-multi], [Mongo — Indexing Strategies][mg-strat].

  ```js
  { chat_id: 1 }                // ❌ prefijo de { chat_id: 1, timestamp: -1 }
  { chat_id: 1, timestamp: -1 } // ✅ sirve a las dos consultas
  ```

- **D3. Las invariantes las garantiza la base, no un chequeo previo en el código.** Unicidad,
  existencia, rango y no-solapamiento se declaran como `UNIQUE`, FK, `CHECK` o `EXCLUDE`. Un
  `find` seguido de un `insert` pierde contra dos requests concurrentes. Verificación: para cada
  regla "no puede haber dos X" o "X debe existir", señalar el constraint que la sostiene.
  Ref: [PG 5.5][pg-constraints].

  ```ts
  // ❌ dos requests en paralelo pasan los dos el find
  if (!(await repo.findClaim(eventId))) await repo.insertClaim(eventId);

  // ✅ el insert es el chequeo: el perdedor choca contra la PK
  await sql`INSERT INTO processed_events (event_id, consumer) VALUES (${id}, ${c}) ON CONFLICT DO NOTHING`;
  ```

- **D4. El schema vive en el repo y se aplica con un comando idempotente, separado del seed.**
  Postgres: migraciones de drizzle, incluidas las custom para lo que drizzle no modela. Mongo:
  índices y validators en un script que se puede correr N veces. El seed solo inserta datos, y la
  app funciona sin seed. Verificación: `createIndex`/`collMod` aparecen solo en el script de schema;
  ningún índice existe únicamente porque alguien lo creó a mano. Ref: [Drizzle — Custom
  migrations][dz-custom].

  ```js
  // ❌ scripts/seed_x.js
  db.notifications.createIndex({ event_id: 1 }, { unique: true });
  db.notifications.insertMany(fixtures);

  // ✅ scripts/db_indexes.ts: createIndex no hace nada si el índice ya existe
  await notifications.createIndex({ event_id: 1 }, { name: "event_id_unique", unique: true });
  ```

- **D5. Cada dato se guarda con el tipo que lo modela.** Instantes: `timestamptz` (PG) o BSON
  `Date` (Mongo), nunca string. Plata: `numeric`, nunca `float` ni `money`. Verificación: revisar
  los tipos de `tables.ts` y los `types.ts` de los documentos Mongo. Ref: [PG wiki — Don't Do
  This][pg-dont], [Mongo — Data Modeling Best Practices][mg-best].

  ```ts
  { timestamp: new Date().toISOString() } // ❌ string: 3× más grande y compara como texto
  { timestamp: new Date() }               // ✅ BSON Date
  ```

### Condicionales

- **D6. Una referencia entre bases declara quién mantiene la consistencia.** Aplica cuando un id de
  una base apunta a otra (sin FK posible). Lo que una FK resolvería con `ON DELETE` (borrar, impedir
  o dejar huérfano) se decide y se implementa en el service que borra. Verificación: para cada
  referencia cruzada, ¿qué pasa con las filas que apuntan al recurso borrado? Ref: [PG 5.5 —
  Foreign Keys][pg-constraints].

  ```ts
  // ✅ el service decide qué hace con las referencias antes de borrar
  if (await bookingsRepo.hasLiveBookings(listingId)) return fail("CONFLICT", "Listing has bookings");
  await listingsRepo.deleteListing(listingId);
  ```

---

## PostgreSQL

### Base

- **P1. Toda FK tiene un índice en la columna que referencia.** Postgres no lo crea solo, y sin él
  cada `DELETE` del padre recorre la tabla hija. Verificación: cada `foreignKey` de `tables.ts` tiene
  un `index` (o una PK) cuya primera columna es la de la FK. Ref: [PG 5.5][pg-constraints].

- **P2. En un índice compuesto, primero las columnas con igualdad, después una con rango u
  orden.** Más de tres columnas rara vez rinde. Verificación: el orden de columnas del índice
  contra el `WHERE` y el `ORDER BY` de la consulta. Ref: [PG 11.3][pg-multi].

  ```sql
  -- WHERE listing_id = $1 AND start_date >= $2
  (start_date, listing_id)  -- ❌ el rango primero: recorre todas las fechas
  (listing_id, start_date)  -- ✅
  ```

- **P3. Un índice parcial solo se usa si el `WHERE` de la consulta implica su predicado
  literalmente.** Con un parámetro (`status <> $1`) el planner no puede probarlo y no lo usa.
  Verificación: el predicado del índice aparece inline en la consulta que lo usa. Ref: [PG
  11.8][pg-partial].

  ```sql
  CREATE INDEX ON outbox (created_at) WHERE published_at IS NULL;
  SELECT * FROM outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 100; -- ✅ lo usa
  ```

- **P4. La unicidad compara lo que el dominio considera igual.** Si dos valores distintos en bytes
  son el mismo para el negocio (`A@x.com` y `a@x.com`), se normaliza antes de guardar con un
  `CHECK` que lo garantice, o el `UNIQUE` va sobre la expresión. Verificación: cada `unique` sobre
  texto libre, contra cómo se normaliza el input. Ref: [PG 11.7 — Indexes on
  Expressions][pg-expr].

  ```sql
  UNIQUE (email)                                    -- ❌ deja registrar A@x.com y a@x.com
  CREATE UNIQUE INDEX users_email_lower ON users (lower(email));  -- ✅
  ```

### Condicionales

- **P5. Una tabla que solo crece tiene retención.** Aplica a tablas de eventos o logs (outbox,
  procesados). Se define cuándo una fila deja de servir y quién la borra, para que la tabla y sus
  índices no crezcan sin techo. Verificación: existe un job o un comando que borra las filas
  vencidas, o una decisión documentada de no hacerlo. Ref: [PG 5.12 — Table Partitioning][pg-part]
  (borrar en bloque sin el costo de un `DELETE` masivo).

---

## MongoDB

### Base

- **M1. Un índice compuesto sigue el orden ESR: igualdad, después sort, después rango.**
  `$ne`, `$nin` y regex cuentan como rango; `$in` con menos de 201 valores, como igualdad.
  Verificación: el orden de claves del índice contra el filtro y el `sort` de la consulta.
  Ref: [Mongo — ESR][mg-esr].

  ```js
  // find({ chat_id, timestamp: { $lt: before } }).sort({ timestamp: -1 })
  { timestamp: -1, chat_id: 1 } // ❌ el rango y el sort antes de la igualdad
  { chat_id: 1, timestamp: -1 } // ✅
  ```

- **M2. Todo upsert o claim por un campo tiene un índice único sobre ese filtro.** Sin él, dos
  upserts concurrentes insertan dos documentos. Verificación: cada `updateOne(..., { upsert: true })`
  y cada insert que se usa como claim (catch de `11000`) tiene un `unique` sobre su filtro.
  Ref: [Mongo — updateOne, `upsert`][mg-upsert].

  ```js
  chats.updateOne({ booking_id }, { $setOnInsert: chat }, { upsert: true });
  chats.createIndex({ booking_id: 1 }, { unique: true }); // ✅ sin esto, la carrera duplica
  ```

- **M3. Un índice único sobre un campo que puede faltar es parcial.** Mongo indexa el faltante como
  `null`, así que un único total admite un solo documento sin el campo. Verificación: cada
  `unique` sobre un campo opcional tiene `partialFilterExpression: { campo: { $exists: true } }`.
  Ref: [Mongo — Unique Indexes][mg-unique].

- **M4. Una colección con estructura estable tiene un validator `$jsonSchema`.** Declara los campos
  requeridos y sus tipos BSON; con `validationLevel: "moderate"` no rechaza los documentos viejos
  que todavía no cumplen. Verificación: `db.getCollectionInfos()` muestra `options.validator` en
  cada colección del alcance. Ref: [Mongo — Schema Validation][mg-validation].

  ```js
  db.runCommand({
    collMod: "messages",
    validator: { $jsonSchema: { bsonType: "object", required: ["chat_id", "sender_id", "timestamp", "body"],
      properties: { timestamp: { bsonType: "date" }, body: { bsonType: "string" } } } },
    validationLevel: "moderate",
  });
  ```

### Condicionales

- **M5. Lo que crece sin límite se referencia, no se embebe.** Aplica cuando un documento tiene un
  array. Un array sin tope (mensajes de un chat) va en su propia colección; uno acotado (fotos de un
  listing, con máximo) puede embeberse. Verificación: cada array embebido tiene un tope en la
  validación del input. Ref: [Mongo — Embedding vs References][mg-embed].

---

## En este repo

Ejemplos canónicos de los criterios que ya se cumplen. Los hallazgos y los condicionales que no
aplican están en `docs/audit/04-datos-audit.md`.

| Criterio | Ref |
|---|---|
| D3 `EXCLUDE` (no-solapamiento) | `db/migrations/0001_booking_no_overlap.sql` |
| D3 `CHECK` de rango | `lib/bookings/tables.ts` (`booking_dates_ordered`, `booking_refund_range`) |
| D3 claim por PK | `lib/outbox/tables.ts` (`processed_events`) + `greenaway-worker/src/pg/events.pg.ts` |
| D4 migración custom (DDL y backfill) | `db/migrations/0001_booking_no_overlap.sql`, `0004_users_email_lowercase_data.sql` |
| D4 índices de Mongo | `scripts/db_indexes.ts` |
| D5 instantes como `Date` | `lib/chat/types.ts` ↔ `greenaway-worker/src/mongo/messages.mongo.ts` |
| P3 parcial con predicado inline | `lib/outbox/tables.ts` (`outbox_pending_idx`) + `greenaway-worker/src/pg/outbox.pg.ts` |
| P4 normalizar + `CHECK` | `lib/auth/validation.ts` + `lib/users/tables.ts` (`users_email_lowercase`) |
| M2 upsert con único | `greenaway-worker/src/mongo/chats.mongo.ts` + `booking_id_unique` |
| M3 único parcial | `event_id_unique` en `scripts/db_indexes.ts` |

**Dónde vive cada cosa:** el schema de Postgres se define en `lib/<service>/tables.ts`, drizzle
genera la migración en `db/migrations/` y `pnpm db:migrate` la aplica. Los índices y validators de
Mongo van en un único script idempotente (`pnpm db:indexes`); `pnpm db:setup` corre los dos. El
seed (`pnpm db:seed`) es un paso aparte y opcional (`db/README.md`): sin índices la app funciona
igual, más lenta, salvo los únicos que sostienen una invariante (M2), que son correctitud y no
performance.

[pg-examine]: https://www.postgresql.org/docs/current/indexes-examine.html
[pg-multi]: https://www.postgresql.org/docs/current/indexes-multicolumn.html
[pg-partial]: https://www.postgresql.org/docs/current/indexes-partial.html
[pg-expr]: https://www.postgresql.org/docs/current/indexes-expressional.html
[pg-constraints]: https://www.postgresql.org/docs/current/ddl-constraints.html
[pg-part]: https://www.postgresql.org/docs/current/ddl-partitioning.html
[pg-dont]: https://wiki.postgresql.org/wiki/Don%27t_Do_This
[mg-strat]: https://www.mongodb.com/docs/manual/applications/indexes/
[mg-esr]: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
[mg-upsert]: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
[mg-unique]: https://www.mongodb.com/docs/manual/core/index-unique/
[mg-validation]: https://www.mongodb.com/docs/manual/core/schema-validation/
[mg-embed]: https://www.mongodb.com/docs/manual/data-modeling/concepts/embedding-vs-references/
[mg-best]: https://www.mongodb.com/docs/manual/data-modeling/best-practices/
[dz-custom]: https://orm.drizzle.team/docs/kit-custom-migrations
