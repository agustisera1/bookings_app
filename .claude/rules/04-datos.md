---
paths:
  - "lib/repositories/**"
  - "lib/postgres.ts"
  - "lib/mongo.ts"
  - "db/**"
  - "scripts/**"
---

# Datos / persistencia (dimensión 4)

> **Desactualizada.** Describe el estado previo a la auditoría de esta dimensión y puede contradecir el código. Ante una diferencia, mandan el código y las reglas ya auditadas (`02-services.md`, `07-frontend.md`).

## Modelo de datos

### PostgreSQL (transaccional)
- `USERS`: id, email, password_hash, name, is_host, created_at
- `BOOKINGS`: id, listing_id (ref MongoDB), guest_id, start_date, end_date, status, total_price, created_at
- `REVIEWS`: id, booking_id, author_id, rating (1-5), comment, host_reply, created_at

### MongoDB (listados)
- `LISTINGS`: _id, type, host_id, title, description, price, location, attributes, photos, created_at
- `attributes` varía según `type`: `accommodation` | `experience` | `equipment`
