# BOOKINGS_NEXT_STEPS.md — Deuda estructural de reservas

Gaps de contrato y de alcance de la feature de reservas. El costo de query del detalle es otra
cosa y vive en [`PERFORMANCE.md`](./PERFORMANCE.md) punto 6; los tres se cierran en el mismo
cambio de schema.

## 1. `GuestBooking` proyecta menos de lo que ya tiene en memoria — sin ticket

- **Dónde:** `lib/apollo/schema.graphql` (`type GuestBooking`) + el `.map()` de
  `lib/apollo/resolvers.ts`.

- **Qué pasa:** el resolver ya tiene el row completo de PG (`findBookingsByGuestId` hace `SELECT *`)
  y el doc completo de Mongo (`findListingsByIds` no proyecta), y descarta todo lo que no entra en
  los 10 campos del tipo.

- **Por qué duele:** son datos que la UI necesita y que no cuestan I/O adicional.
  - Del row: `listing_id` (sin él el detalle no puede linkear al listing), `status_reason` (el
    motivo que el host escribió), `refund_amount` (lo reembolsado **de verdad**; hoy la UI solo
    estima con `refundFor`), `cancelled_by`, `cancelled_at`.
  - Del doc: `location`, `price` (la tarifa real por noche — hoy `booking-detail-model.ts` la
    deriva como `total ÷ noches`), `attributes.check_in_time` / `check_out_time`, `host_id`.

- **Idea de fix:** un campo `listing: Listing` en vez de aplanar campo por campo — el tipo `Listing`
  ya existe en el schema con `location`, `price` y `rating_avg`. No toca services ni repos.

## 2. Un host no puede abrir el detalle de una reserva recibida — sin ticket

- **Dónde:** `app/(app)/bookings/[id]/page.tsx`, que resuelve contra `Query.guestBookings`.

- **Qué pasa:** `guestBookings` devuelve solo las filas donde el usuario es **guest**. Para un host,
  la reserva que recibió no está en la lista y la ruta responde 404 — indistinguible de una reserva
  que no existe, porque ese colapso es deliberado (evita confirmar reservas ajenas).

- **Por qué duele:** el rol host existe y gestiona reservas recibidas (RF-02), pero su única vista
  es el bloque embebido en `listings/[id]`. No tiene página propia por reserva.

- **Idea de fix:** el `Query.booking(id)` del punto 6 de `PERFORMANCE.md`, con el scoping por
  ownership aceptando guest **u** host. No hace falta un `findBookingsByHostId` nuevo: es
  componible con `getListings({ own: true })` → `getBookingsByListingIds`, que ya existen.

## 3. Una reseña no se puede atar a una reserva ni a su autor — sin ticket

- **Dónde:** tabla `reviews` (`db/migrations/001_initial_schema.sql:35-43`), `reviews.pg.ts`.

- **Qué pasa:** la tabla es `listing_id` + `author_name` (texto libre). No tiene `booking_id` ni
  `author_id`.

- **Por qué duele:** no hay forma de preguntar "¿este huésped ya reseñó esta estadía?", así que el
  detalle de una reserva completada no puede ofrecer el CTA de reseña ni evitar duplicados. La
  regla de negocio "solo reseña quien completó una reserva" no es verificable contra los datos.

- **Idea de fix:** migración que agregue `booking_id` y `author_id` con FK. Es la única de las tres
  que no se resuelve con schema de GraphQL.

> **Nota:** el modelo de datos de `CLAUDE.md` describe `REVIEWS` con `booking_id` y `author_id`.
> La tabla real nunca los tuvo. Corregir esa sección es parte de este ítem.
