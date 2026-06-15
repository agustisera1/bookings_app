# Bookings App — CLAUDE.md

Marketplace de reservas de alojamientos (estilo Airbnb simplificado). Objetivo de aprendizaje: persistencia políglota, procesamiento asíncrono y APIs GraphQL.

## Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Package manager**: pnpm
- **API**: REST simple en Fase 1, GraphQL (Apollo Server) desde Fase 2
- **DBs**: PostgreSQL (núcleo transaccional), MongoDB (listados), Redis (locks/cache/sesiones), Elasticsearch (búsqueda)
- **Cola de mensajes**: RabbitMQ (o Redis Streams para Fase 4)
- **Auth**: JWT (access + refresh)
- **Infra local**: Docker Compose

## Roles de usuario

| Rol   | Descripción                                                   |
|-------|---------------------------------------------------------------|
| Guest | Busca, reserva, deja reseñas                                  |
| Host  | Crea y administra listados, gestiona reservas recibidas       |
| Admin | Modera contenido, accede a métricas globales                  |

Un usuario puede tener rol guest y host simultáneamente.

## Modelo de datos

### PostgreSQL (transaccional)
- `USERS`: id, email, password_hash, name, is_host, is_admin, created_at
- `BOOKINGS`: id, listing_id (ref MongoDB), guest_id, start_date, end_date, status, total_price, created_at
- `REVIEWS`: id, booking_id, author_id, rating (1-5), comment, host_reply, created_at

### MongoDB (listados — desde Fase 2)
- `LISTINGS`: _id, type, host_id, title, description, price, location, attributes, photos, created_at
- `attributes` varía según `type`: `accommodation` | `experience` | `equipment`

## Plan de fases

1. **Fase 1** — Solo PostgreSQL: auth + RBAC, CRUD de listados (solo `accommodation`), reservas sin solapamiento, reseñas
2. **Fase 2** — MongoDB: migrar listados, múltiples tipos, API GraphQL
3. **Fase 3** — Redis: locks de concurrencia en reservas, cache de disponibilidad, sesiones
4. **Fase 4** — Elasticsearch: búsqueda full-text y filtros; cola de mensajes para sincronizar Mongo → ES
5. **Fase 5** — Workers: notificaciones email por eventos de reserva, trazabilidad
6. **Fase 6** — Hardening: Nginx (rate limiting), Prometheus/Grafana, OpenTelemetry, pruebas de carga (k6)

## Reglas clave

- Las reservas deben ser atómicas: sin solapamiento de fechas para el mismo listado, incluso bajo concurrencia (RNF-01)
- El índice de búsqueda puede tener lag de segundos respecto a la fuente de verdad (RNF-02)
- Cada mutación GraphQL valida rol y ownership del recurso (RNF-05)
- Notificaciones y sincronización de búsqueda son siempre asíncronas (RNF-04)

## Comandos

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # build de producción
pnpm lint     # linting
```
