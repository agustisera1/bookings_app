# TD-03 — Índices de `bookings`: GiST parcial para disponibilidad + los dos huecos de FK/listing

| | |
|---|---|
| **Branch** | `perf/bookings-daterange-gist` |
| **Bloque** | Índices |
| **Prioridad** | 🔴 Alta |
| **Esfuerzo** | ~1 h |
| **Depende de** | — |
| **Origen** | [`tech_debt/PERFORMANCE.md`](../tech_debt/PERFORMANCE.md) § Alto impacto |
| **Repos** | `bookings_app` |

## Problema

`findBookedListingIds` (`lib/repositories/bookings.pg.ts`) busca solapamiento de rango **sin**
predicado de `listing_id`:

```sql
WHERE status NOT IN ('cancelled','rejected')
  AND tstzrange(start_date, end_date, '[]') && tstzrange($1,$2,'[]')
```

El único índice que cubre rangos es el de la constraint `no_overlap`
(`db/migrations/003_booking_no_overlap.sql`):

```sql
gist (listing_id WITH =, tstzrange(start_date, end_date, '[]') WITH &&)
```

Ese índice **sí es aplicable** a esta query — las dos condiciones se cumplen:

- **Predicado parcial:** el `WHERE` de la query repite literal el del índice, con constantes, así que
  lo implica. ([docs](https://www.postgresql.org/docs/current/indexes-partial.html): "el predicado
  tiene que coincidir exactamente con parte del `WHERE` de la query").
- **Columna líder:** aunque la query no filtre por `listing_id`, GiST **no tiene regla de prefijo**.
  ([docs](https://www.postgresql.org/docs/current/indexes-multicolumn.html): "un índice GiST
  multicolumna puede usarse con condiciones que involucren cualquier subconjunto de sus columnas").

Lo que falla es el **costo**. Con `listing_id` como dimensión líder, los bounding boxes de los nodos
internos agrupan primero por listing, y la dimensión de rango queda con intervalos anchos y
solapados en cada nodo. Poda mal, el scan recorre buena parte del índice, y el planner termina
prefiriendo un `Seq Scan` sobre todas las reservas activas, calculando `tstzrange` fila por fila.

## Por qué entra

**Aprendizaje**, y es probablemente la lección de Postgres más densa que queda en el proyecto.

Es el caso donde "ya tengo un índice que cubre esas columnas" es cierto y **aun así no alcanza**. El
índice existe, es aplicable, el planner lo evalúa — y lo descarta igual porque le sale más caro que
leer la tabla entera. La distinción entre *aplicable* y *elegido* solo se ve en el `EXPLAIN ANALYZE`.

Enseña además que la **regla del prefijo es de B-tree**, no de todo índice: en GiST el orden de
columnas cambia el costo, no la aplicabilidad. Ver `docs/insights/POSTGRES_INDEXES.md` §3.

Suma dos conceptos más en el mismo cambio: **índices parciales** (indexar solo las filas que
importan, y la condición de implicación que los hace usables) y **índices sobre expresión** (indexar
`tstzrange(...)`, no las columnas crudas).

## Alcance

Migración nueva (`007_bookings_indexes.sql`), con los tres índices que le faltan a `bookings`:

```sql
CREATE INDEX bookings_daterange_gist
  ON bookings USING gist (tstzrange(start_date, end_date, '[]'))
  WHERE status NOT IN ('cancelled', 'rejected');

CREATE INDEX bookings_guest_id_idx   ON bookings (guest_id);
CREATE INDEX bookings_listing_id_idx ON bookings (listing_id);
```

| Índice | Query que destraba | Por qué no estaba cubierta |
|---|---|---|
| `bookings_daterange_gist` | `findBookedListingIds` | El GiST de `no_overlap` es aplicable pero pierde por costo (ver Problema) |
| `bookings_guest_id_idx` | `findBookingsByGuestId` (`/bookings`) | `guest_fk` es una FK, y una FK **no** crea índice sobre la columna referenciante |
| `bookings_listing_id_idx` | `getBookingsByListingId`, `hasGuestBookingForListing` | El GiST tiene `listing_id` como columna líder, pero es **parcial** y estas queries no filtran por status → no implican su predicado |

El `WHERE` del índice parcial tiene que **coincidir con el de la query** para que el planner lo
considere aplicable — es la parte que hay que verificar, no asumir.

> El GiST nuevo **no** necesita `btree_gist`: esa extensión la pedía `003` para meter la igualdad
> sobre `listing_id` (un `varchar`) en un índice GiST. Acá la única dimensión es un rango, que GiST
> soporta nativo.

> `bookings_listing_id_idx` también toca **TD-06**: el N+1 del rail de mensajería no eran N round
> trips sino N seq scans sobre `bookings` entera. Vale re-medir TD-06 después de esta migración.

> ⚠️ El predicado `status NOT IN ('cancelled','rejected')` queda replicado acá, en el `WHERE` de la
> query y en el constraint de `003`. Es la misma regla de negocio en tres lugares — el problema que
> ataca **TD-12**. Conviene hacer los dos tickets seguidos y decidir ahí qué copia sobrevive.

**Antes de escribir la migración:** correr `EXPLAIN ANALYZE` de la query actual y guardar la salida.
Sin la medición previa el ticket pierde todo su valor.

## Criterio de aceptación

- [ ] `EXPLAIN ANALYZE` **antes**: `Seq Scan on bookings`, guardado en el PR.
- [ ] `EXPLAIN ANALYZE` **después**: `Index Scan` / `Bitmap Index Scan` sobre
      `bookings_daterange_gist`, guardado en el PR.
- [ ] Mismo antes/después para `findBookingsByGuestId` y `getBookingsByListingId`, los otros dos
      índices de la migración.
- [ ] Queda registrado qué hacía el planner con el índice de `no_overlap` y por qué, según lo que
      muestre el `EXPLAIN`.
- [ ] La migración corre y revierte limpia (`pnpm db:migrate` / `pnpm db:rollback`).

> Con pocos datos el planner puede preferir el seq scan igual, porque a esa escala es más barato.
> Si pasa, **no es un fallo del índice**: sembrar suficientes reservas para que el plan cambie es
> parte del ticket. Ver el planner cambiar de opinión por volumen es la mitad del aprendizaje.

## Fuera de alcance

- Los índices de filtros en Mongo y el `$nin` sin cota (`PERFORMANCE.md` puntos 4 y 5). Los resuelve
  Elasticsearch en Fase 4.
- Mover `SLOT_HOLDING_STATUSES` fuera del repo → **TD-12**.
