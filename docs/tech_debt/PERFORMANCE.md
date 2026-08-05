# PERFORMANCE.md — Deuda de performance conocida

Backlog de tuning de performance. Cada ítem tiene: dónde vive, por qué es un problema, cómo medirlo
y una idea de fix.

Cada ítem lleva su ticket en [`docs/tickets/`](../tickets/), o la fase del plan que lo
resuelve.

> Los números son identificadores estables: se referencian desde `docs/tickets/` como "punto N". Un
> ítem resuelto se borra y su número queda vacío — no se renumera el resto.

> Contexto del stack: MongoDB para listados, PostgreSQL para reservas. La búsqueda de
> Fase 4 (Elasticsearch) todavía no existe, así que los filtros corren directo contra Mongo.

---

## 🔴 Alto impacto — capa de datos

### 4. COLLSCAN en Mongo: filtros de búsqueda sin índices — ⏸️ Fase 4 (Elasticsearch)

- **Dónde:** `lib/services/listings.ts` (`getListings`) + `lib/repositories/listings.mongo.ts` (`findListings`)
- **Qué pasa:** el filtro se arma sobre muchos campos —`type`, `host_id`, `rating_avg`,
  `price`, `attributes.property_type`, `attributes.beds`, `attributes.bathrooms`,
  `attributes.max_guests`, `attributes.amenities`— pero el **único índice** existente es el
  text index sobre `title`/`description` (`scripts/seed_listings.js:289`).
- **Por qué duele:**
  - Una búsqueda **sin `term`** (solo filtros, el caso más común al abrir el panel) es un
    **full collection scan** en cada request.
  - `cursor.limit(12)` no ayuda: sin índice, Mongo igual recorre la colección buscando los 12
    que matcheen; el límite solo capa lo devuelto, no lo escaneado.
  - No hay `sort` → orden "natural" (inserción), inconsistente entre páginas.
- **Cómo medirlo:** `db.listings.find(<filtro>).explain("executionStats")` → mirar
  `totalDocsExamined` vs `nReturned` y `stage: COLLSCAN`.
- **Idea de fix:** lo resuelve Elasticsearch. No invertir en índices compuestos sobre `attributes.*`
  que se tiran cuando entre ES.

### 5. `$nin` con array de ObjectIds sin cota — ⏸️ Fase 4 (Elasticsearch)

- **Dónde:** `lib/services/listings.ts` (`getListings`, exclusión por disponibilidad)
  ```ts
  params._id = { $nin: bookedIds.map((id) => new ObjectId(id)) };
  ```
- **Qué pasa:** para un rango de fechas popular, `bookedIds` puede crecer sin límite. `$nin` es
  un operador negativo: no usa índice de forma selectiva y se evalúa doc por doc. Combinado con
  el punto 4 (COLLSCAN) amplifica el costo.
- **Nota:** el flujo PG → Mongo es secuencial e inevitable (Mongo depende del resultado de PG),
  así que las dos latencias se suman.
- **Idea de fix:** con ES la disponibilidad se resuelve como filtro en el índice de búsqueda, en vez
  de un `$nin` post-hoc. Va en el mismo paquete que el punto 4.

---

## 🟡 Impacto medio — capa de datos

### 6. El detalle de una reserva trae todas las reservas del usuario — sin ticket

- **Dónde:** `app/(app)/bookings/[id]/page.tsx`
- **Qué pasa:** no existe una query de una reserva sola, así que la ruta corre `GetUserBookings`
  —el mismo payload que la lista— y descarta todo menos la fila cuyo `id` matchea en memoria.
- **Por qué duele:** el costo por request crece con el historial del usuario, no con lo que la
  página muestra. Para renderizar una reserva, el resolver hace un `SELECT *` de todas
  (`findBookingsByGuestId`) **más** un lookup en Mongo de todos los listings involucrados
  (`getListingsByIds`).
- **Cómo medirlo:** filas devueltas por el resolver vs. las renderizadas (1), con una cuenta de
  reservas realista para un usuario activo.
- **Idea de fix:** una query `booking(id)` que resuelva una sola. `bookingsRepo.getBookingById` ya
  existe; falta el service con `authorize` + ownership y el resolver. Va junto con los gaps de
  contrato de [`BOOKINGS_NEXT_STEPS.md`](./BOOKINGS_NEXT_STEPS.md), que se cierran en el mismo
  cambio de schema.
