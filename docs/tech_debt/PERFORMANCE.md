# PERFORMANCE.md — Deuda de performance conocida

Backlog de tuning de performance. **No es prioritario ahora** (Fase 1/2, volúmenes bajos),
pero queda documentado para ajustar cuando `listings` y `bookings` crezcan.

Cada ítem tiene: dónde vive, por qué es un problema, cómo medirlo y una idea de fix.
Ordenado por impacto esperado a medida que crecen los datos.

> Contexto del stack: MongoDB para listados, PostgreSQL para reservas. La búsqueda de
> Fase 4 (Elasticsearch) todavía no existe, así que los filtros corren directo contra Mongo.
> Varios de estos ítems desaparecen o cambian cuando entre ES.

---

## 🔴 Alto impacto — capa de datos

### 1. COLLSCAN en Mongo: filtros de búsqueda sin índices

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
- **Idea de fix:**
  - Índices compuestos alineados a los filtros más frecuentes (medir primero cuáles son).
    Candidatos: `{ type: 1, price: 1 }`, `{ type: 1, rating_avg: 1 }`, y sobre
    `attributes.*` los de mayor uso.
  - Definir un `sort` estable (p. ej. `rating_avg` desc, o `created_at`) y que el índice lo cubra.
  - **A futuro real:** esto es exactamente lo que resuelve Elasticsearch (Fase 4). Evaluar si
    conviene indexar en Mongo o esperar a ES antes de invertir en índices que después se tiran.

### 2. `findBookedListingIds`: la query de disponibilidad no usa el índice GiST

- **Dónde:** `lib/repositories/bookings.pg.ts` (`findBookedListingIds`)
- **Qué pasa:** filtra por overlap de rango **sin** predicado de `listing_id`:
  ```sql
  WHERE status NOT IN ('cancelled','rejected')
    AND tstzrange(start_date, end_date, '[]') && tstzrange($1,$2,'[]')
  ```
  El índice de la constraint `no_overlap` (`db/migrations/003_booking_no_overlap.sql`) es
  `gist (listing_id WITH =, tstzrange(...) WITH &&)`. Con `listing_id` como **primera columna**
  y la query sin filtrar por listing, ese índice **no es aprovechable** → scan de todas las
  reservas activas, calculando `tstzrange` fila por fila. O(n) sobre `bookings`.
- **Cómo medirlo:** `EXPLAIN ANALYZE` de la query → buscar `Seq Scan on bookings`.
- **Idea de fix:** índice GiST dedicado solo sobre el rango, parcial con el mismo `WHERE`:
  ```sql
  CREATE INDEX bookings_daterange_gist
    ON bookings USING gist (tstzrange(start_date, end_date, '[]'))
    WHERE status NOT IN ('cancelled','rejected');
  ```

### 3. `$nin` con array de ObjectIds sin cota

- **Dónde:** `lib/services/listings.ts` (`getListings`, exclusión por disponibilidad)
  ```ts
  params._id = { $nin: bookedIds.map((id) => new ObjectId(id)) };
  ```
- **Qué pasa:** para un rango de fechas popular, `bookedIds` puede crecer sin límite. `$nin` es
  un operador negativo: no usa índice de forma selectiva y se evalúa doc por doc. Combinado con
  el punto 1 (COLLSCAN) amplifica el costo.
- **Nota:** el flujo PG → Mongo es secuencial e inevitable (Mongo depende del resultado de PG),
  así que las dos latencias se suman.
- **Idea de fix:** reevaluar cuando entre ES (la disponibilidad podría resolverse como filtro
  en el índice de búsqueda en vez de un `$nin` post-hoc). Mientras tanto, acotar el rango de
  fechas permitido y/o medir el tamaño típico de `bookedIds`.

### 6. N+1 en el rail de mensajería: una query por listing del host

- **Dónde:** `lib/services/chat.ts` (`getUserConversations`)
- **Qué pasa:** el lado host resuelve las conversaciones listando los listings propios y
  pidiendo las reservas **de a un listing por vez**:
  ```ts
  hostListings.map((listing) => bookingsRepo.getBookingsByListingId(listing._id))
  ```
  Están en `Promise.all`, así que corren en paralelo, pero siguen siendo N round trips a PG y
  N conexiones del pool ocupadas. Un host con 40 listings paga 40 queries por cada carga de
  `/messages`.
- **Cómo medirlo:** contar queries en el log de PG al abrir `/messages` con un usuario host,
  o `EXPLAIN ANALYZE` del agregado.
- **Idea de fix:** una sola query por lote. Necesita una función nueva en el repo:
  ```sql
  SELECT * FROM bookings WHERE listing_id = ANY($1)
  ```

### 7. La lista de conversaciones no tiene cota (y cada fila prefetchea)

- **Dónde:** `lib/services/chat.ts` (`getUserConversations`) + `components/chat/conversation-item.tsx`
- **Qué pasa:** se devuelven **todas** las reservas históricas del usuario, sin `limit` ni
  paginación. Encima cada fila es un `<Link>` de Next, que **prefetchea el payload RSC al
  entrar en viewport** — así que una historia larga no es solo una lista larga, es una ráfaga
  de requests especulativos al scrollear el rail.
- **Por qué duele:** crece monótonamente con el uso. Un usuario de un año tiene el rail más
  pesado de la app sin que nada lo justifique: solo se ven ~10 filas a la vez.
- **Idea de fix:** `limit` + paginación (o scroll infinito) en el service, y `prefetch={false}`
  en las filas que no están activas. Se resuelve solo en parte cuando exista el service
  dedicado de chats (ver `CHAT_FEATURE_NEXT_STEPS.md`), que además permite ordenar por
  actividad en vez de traer todo.

---

## 🟡 Bajo impacto — rendering y red (evitable, no urgente)

### 4. `appliedToDraft()` se recalcula varias veces por render

- **Dónde:** `components/search/filters.tsx`
- **Qué pasa:** se invoca en el lazy-init del reducer (ok), pero también en
  `const activeCount = countActiveFilters(appliedToDraft())` y dentro de `handleOpenChange`.
  Cada llamada aloca un objeto nuevo y parsea fechas (`fromISODate` crea `Date`s).
- **Idea de fix:** computar el "applied" una sola vez por render y derivar `activeCount` de ahí.
  (React Compiler memoiza parte, pero la llamada dentro de `activeCount` corre en cada render.)

### 5. `new Date()` inline en los `disabled` de `booking-form.tsx`

- **Dónde:** `components/bookings/booking-form.tsx`
  ```ts
  disabled={[{ before: new Date() }, ...]}
  ```
- **Qué pasa:** aloca `Date` + array nuevos en cada render y los pasa como prop al
  `DatePicker`/`Calendar`, rompiendo la estabilidad referencial y forzando re-render del Calendar.
- **Referencia del patrón correcto:** `filters.tsx` ya captura `today` con
  `useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; })`. Aplicar lo mismo acá.

### 6. `/messages` bloquea el hilo esperando el rail

- **Dónde:** `app/(app)/messages/layout.tsx`
- **Qué pasa:** el layout hace `await getUserConversations()` antes de renderizar nada. Como
  el layout envuelve al hilo, **el panel derecho —que es lo que el usuario fue a ver— espera
  a que termine la query del rail**, incluyendo el N+1 del punto 6 de arriba.
- **Idea de fix:** envolver el rail en `<Suspense>` con un skeleton, para que el hilo pinte
  primero. El rail es un layout justamente para no refetchearse al cambiar de conversación,
  así que solo paga esto en la primera carga — pero es la carga que más se nota.

### 7. Thumbnails del rail con `unoptimized`

- **Dónde:** `components/chat/conversation-item.tsx`
- **Qué pasa:** las fotos se renderizan con `next/image` + `unoptimized`, o sea la imagen
  remota **a tamaño completo** escalada a 48px por CSS. Copia la convención de
  `listing-photos.tsx`, pero ahí son pocas fotos en un detalle; acá son N por lista.
- **Idea de fix:** declarar `remotePatterns` en `next.config.ts` para el host de las fotos y
  sacar `unoptimized`, así el optimizador sirve un thumbnail real. Aplica también a
  `listing-photos.tsx` y al resto de los listados.

### 8. `SELECT *` para las 5 columnas que usa el rail

- **Dónde:** `lib/repositories/bookings.pg.ts` (`findBookingsByGuestId`, `getBookingsByListingId`)
- **Qué pasa:** ambas traen la fila completa de `bookings` (14 columnas, incluidas
  `status_reason`, `refund_amount`, `cancelled_*`) cuando una conversación solo necesita
  `id`, `listing_id`, `guest_id`, `start_date`, `end_date`, `status`.
- **Nota:** no es un cambio trivial — esos repos devuelven `Booking[]` y otros consumers
  dependen del tipo completo. Requiere una proyección aparte, no tocar las existentes.

### 9. `resolveViewerParty` agrega dos queries por carga de hilo

- **Dónde:** `lib/services/chat.ts` (`resolveViewerParty`, usado por `getChatHistory`)
- **Qué pasa:** para autorizar la lectura del hilo se pide el booking a PG y, si el usuario
  no es el guest, el listing a Mongo. Son secuenciales (Mongo depende del resultado de PG).
- **Por qué se acepta:** cierra un agujero de autorización real (antes cualquier usuario
  autenticado leía cualquier hilo con solo tener el id). El costo es correcto; queda anotado
  para cachear si el hilo se vuelve caliente.

---
