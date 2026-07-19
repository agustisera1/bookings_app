# TD-03 — Índice GiST parcial para la query de disponibilidad

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

`listing_id` es la **primera columna**. Como la query no filtra por listing, no hay prefijo por
donde entrar al índice: Postgres lo descarta y hace un seq scan de todas las reservas activas,
calculando `tstzrange` fila por fila. O(n) sobre `bookings` en cada búsqueda con fechas.

## Por qué entra

**Aprendizaje**, y es probablemente la lección de Postgres más densa que queda en el proyecto.

Es un caso donde "ya tengo un índice que cubre esas columnas" es falso por una razón no obvia: el
**orden de las columnas** decide qué queries puede servir. Un índice existente, correcto y usado por
otra query, es inútil para esta. Eso no se aprende leyéndolo, se aprende viendo el `Seq Scan` en el
`EXPLAIN ANALYZE` y verlo cambiar.

Suma dos conceptos más en el mismo cambio: **índices parciales** (indexar solo las filas que
importan) y **índices sobre expresión** (indexar `tstzrange(...)`, no las columnas crudas).

## Alcance

Migración nueva (`007_bookings_daterange_gist.sql`):

```sql
CREATE INDEX bookings_daterange_gist
  ON bookings USING gist (tstzrange(start_date, end_date, '[]'))
  WHERE status NOT IN ('cancelled', 'rejected');
```

El `WHERE` del índice tiene que **coincidir con el de la query** para que el planner lo considere
aplicable — es la parte que hay que verificar, no asumir.

> ⚠️ El predicado `status NOT IN ('cancelled','rejected')` queda replicado acá, en el `WHERE` de la
> query y en el constraint de `003`. Es la misma regla de negocio en tres lugares — el problema que
> ataca **TD-12**. Conviene hacer los dos tickets seguidos y decidir ahí qué copia sobrevive.

**Antes de escribir la migración:** correr `EXPLAIN ANALYZE` de la query actual y guardar la salida.
Sin la medición previa el ticket pierde todo su valor.

## Criterio de aceptación

- [ ] `EXPLAIN ANALYZE` **antes**: `Seq Scan on bookings`, guardado en el PR.
- [ ] `EXPLAIN ANALYZE` **después**: `Index Scan` / `Bitmap Index Scan` sobre
      `bookings_daterange_gist`, guardado en el PR.
- [ ] Queda registrado por qué el índice de `no_overlap` no servía — el orden de columnas.
- [ ] La migración corre y revierte limpia (`pnpm db:migrate` / `pnpm db:rollback`).

> Con pocos datos el planner puede preferir el seq scan igual, porque a esa escala es más barato.
> Si pasa, **no es un fallo del índice**: sembrar suficientes reservas para que el plan cambie es
> parte del ticket. Ver el planner cambiar de opinión por volumen es la mitad del aprendizaje.

## Fuera de alcance

- Los índices de filtros en Mongo y el `$nin` sin cota (`PERFORMANCE.md` puntos 4 y 5). Los resuelve
  Elasticsearch en Fase 4.
- Mover `SLOT_HOLDING_STATUSES` fuera del repo → **TD-12**.
