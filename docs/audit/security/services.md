# Seguridad — hallazgos en services

Encontrados al auditar los services (`docs/audit/02-services-audit.md`). Criterio: RNF-05 (cada mutación valida rol **y** ownership del recurso).

| # | Hallazgo | Dónde |
|---|---|---|
| 1 | Sin chequeo de ownership: cualquier host puede editar, borrar o quitar fotos de un listing ajeno (`listings:manage-own` no dice *cuál*, y el repo filtra solo por `_id`) | `listings.editListing`, `deleteListing`, `removeListingPhoto` |
| 2 | Cualquier usuario autenticado ve las reservas de cualquier listing: `bookings:view-own-listings` lo tiene también el guest y no se chequea que el listing sea suyo | `listings.getListingBookings` |
| 3 | `createBooking` deja que un host reserve su propio listing y confía en el `totalPrice` que manda el cliente | `bookings.createBooking` |
