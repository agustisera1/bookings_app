# Proyecto B — Marketplace de reservas (estilo Airbnb simplificado)

## 1. Resumen

Plataforma de reservas de alojamientos, con evolución planificada hacia múltiples tipos de listados (experiencias, equipamiento). Enfocado en **persistencia poliglota, procesamiento asíncrono y APIs GraphQL**.

Tema central de aprendizaje: **integración de múltiples bases de datos especializadas, consistencia eventual, colas de mensajes, y diseño de APIs GraphQL con autorización granular**.

---

## 2. Roles de usuario

| Rol | Descripción |
|---|---|
| Guest | Busca, filtra, reserva alojamientos, deja reseñas |
| Host | Crea y administra sus propios listados, gestiona disponibilidad y reservas recibidas |
| Admin | Modera contenido, gestiona disputas, accede a métricas globales |

---

## 3. Requerimientos funcionales

### 3.1 Autenticación y cuentas
- RF-01: Registro y login (JWT access + refresh token)
- RF-02: Un usuario puede tener rol guest y host simultáneamente (no son excluyentes)
- RF-03: Panel de administración accesible solo para rol admin

### 3.2 Listados (alojamientos — Fase 1)
- RF-04: Host crea un listado: título, descripción, precio por noche, ubicación, capacidad, fotos
- RF-05: Host edita o elimina sus propios listados
- RF-06: Guest puede ver el detalle de un listado, incluyendo calendario de disponibilidad
- RF-07: Guest puede buscar listados por ubicación, rango de fechas y precio

### 3.3 Reservas
- RF-08: Guest reserva un listado para un rango de fechas
- RF-09: El sistema **no permite** reservas con solapamiento de fechas para el mismo listado
- RF-10: Host puede ver las reservas de sus listados
- RF-11: Guest puede cancelar una reserva (según política de cancelación del listado)

### 3.4 Reseñas
- RF-12: Guest puede dejar una reseña (rating 1-5 + comentario) después de una estadía finalizada
- RF-13: Host puede responder públicamente a una reseña

### 3.5 Catálogo extendido (Fase 2+)
- RF-14: Host puede crear listados de tipo "experiencia" (duración, idioma, punto de encuentro) o "equipamiento" (unidades disponibles, depósito)
- RF-15: Cada tipo de listado tiene atributos propios sin afectar el modelo de los demás tipos

### 3.6 Búsqueda avanzada (Fase 4+)
- RF-16: Búsqueda full-text sobre título y descripción de listados
- RF-17: Filtros combinables: tipo de listado, rango de precio, ubicación, rating mínimo
- RF-18: Resultados de búsqueda reflejan cambios de listados en un tiempo razonable (segundos), no necesariamente instantáneo

### 3.7 Notificaciones (Fase 5+)
- RF-19: Host recibe notificación (email) ante una nueva reserva
- RF-20: Guest recibe notificación de confirmación de reserva
- RF-21: Las notificaciones se procesan de forma asíncrona, sin bloquear la respuesta de la API

---

## 4. Requerimientos no funcionales

- RNF-01: **Consistencia transaccional** — la creación de una reserva debe ser atómica: no debe ser posible que dos reservas se confirmen para el mismo rango de fechas del mismo listado, incluso bajo concurrencia (race conditions)
- RNF-02: **Consistencia eventual aceptable** — el índice de búsqueda (Elasticsearch) puede estar desactualizado por unos segundos respecto a la fuente de verdad (MongoDB/Postgres)
- RNF-03: **Aislamiento de responsabilidades por motor de DB**:
  - PostgreSQL: usuarios, reservas, pagos, relaciones con integridad referencial
  - MongoDB: listados (esquema flexible según tipo)
  - Redis: locks de concurrencia para reservas, cache de disponibilidad, sesiones
  - Elasticsearch: índice de búsqueda de listados
- RNF-04: **Procesamiento asíncrono** — notificaciones y sincronización del índice de búsqueda se procesan vía cola de mensajes (no en el ciclo de request/response)
- RNF-05: **Autorización granular** — cada mutación de la API GraphQL valida el rol del usuario y, cuando aplica, que sea el owner del recurso (ej. solo el host dueño puede editar su listado)
- RNF-06: **Rate limiting** — límite de requests por usuario/IP, especialmente en endpoints de búsqueda y creación de reservas
- RNF-07: **Observabilidad** — trazabilidad de una reserva a través de todo el flujo (API → Postgres → cola → workers → notificación)

---

## 5. Modelo de datos

### 5.1 PostgreSQL (núcleo transaccional)

```mermaid
erDiagram
  USERS {
    uuid id PK
    string email
    string password_hash
    string name
    boolean is_host
    boolean is_admin
    timestamp created_at
  }
  BOOKINGS {
    uuid id PK
    uuid listing_id FK
    uuid guest_id FK
    date start_date
    date end_date
    string status
    numeric total_price
    timestamp created_at
  }
  REVIEWS {
    uuid id PK
    uuid booking_id FK
    uuid author_id FK
    int rating
    string comment
    string host_reply
    timestamp created_at
  }

  USERS ||--o{ BOOKINGS : makes
  USERS ||--o{ REVIEWS : writes
  BOOKINGS ||--o| REVIEWS : "can have"
```

> `listing_id` referencia un documento de MongoDB (Fase 2+) — la referencia se guarda como string/UUID, sin foreign key real entre motores.

### 5.2 MongoDB (catálogo de listados — desde Fase 2)

```mermaid
erDiagram
  LISTINGS {
    ObjectId _id PK
    string type
    uuid host_id
    string title
    string description
    numeric price
    object location
    object attributes
    array photos
    datetime created_at
    datetime updated_at
  }
```

> `attributes` es un objeto cuya forma depende de `type`: `accommodation` (beds, check_in_time...), `experience` (duration_minutes, language...), `equipment` (units_available, deposit...).

---

## 6. Arquitectura por fase

### Fase 1 — Solo PostgreSQL

```mermaid
flowchart LR
  Client --> API["API REST/GraphQL"]
  API --> PG["PostgreSQL"]
```

### Fase 2-4 — Arquitectura completa (poliglota)

```mermaid
flowchart TB
  Client["Cliente (web)"]
  API["API GraphQL"]
  PG["PostgreSQL (usuarios, reservas)"]
  Mongo["MongoDB (listados)"]
  Redis["Redis (locks, cache, sesiones)"]
  ES["Elasticsearch (búsqueda)"]
  Queue["Cola de mensajes"]
  Worker["Workers (notificaciones, reindexado)"]

  Client --> API
  API --> PG
  API --> Mongo
  API --> Redis
  API -->|"búsqueda"| ES
  API -->|"publica eventos"| Queue
  Queue --> Worker
  Worker --> ES
  Worker -->|"emails"| Notif["Servicio de email"]
```

### Flujo: creación de reserva (con lock de concurrencia)

```mermaid
sequenceDiagram
  participant C as Cliente
  participant A as API
  participant R as Redis
  participant P as PostgreSQL
  participant Q as Cola

  C->>A: crear reserva (listing_id, fechas)
  A->>R: adquirir lock (listing_id + rango fechas)
  alt lock obtenido
    A->>P: verificar solapamiento y crear reserva (transacción)
    P-->>A: reserva creada
    A->>R: liberar lock
    A->>Q: publicar evento "booking.created"
    A-->>C: confirmación
  else lock no disponible
    A-->>C: error: fechas no disponibles / reintento
  end
```

---

## 7. Plan de fases

1. **Fase 1**: PostgreSQL únicamente. Auth + RBAC (guest/host/admin), CRUD de listados (solo alojamientos), reservas sin solapamiento (constraint/transacción en Postgres), reseñas. API REST o GraphQL simple.
2. **Fase 2**: Migrar listados a MongoDB. Soportar múltiples `type` de listado con `attributes` flexibles. API GraphQL para listados (consultas anidadas listado → reseñas → host).
3. **Fase 3**: Redis para locks de concurrencia en reservas + cache de disponibilidad + sesiones.
4. **Fase 4**: Elasticsearch para búsqueda full-text y filtros combinados. Cola de mensajes (RabbitMQ o Redis Streams) para sincronizar Mongo → Elasticsearch.
5. **Fase 5**: Workers para notificaciones por email ante eventos de reserva. Trazabilidad del flujo completo.
6. **Fase 6 — Hardening**: reverse proxy (Nginx) con rate limiting, métricas (Prometheus/Grafana), tracing (OpenTelemetry), pruebas de carga (k6) sobre el endpoint de creación de reservas.

---

## 8. Stack sugerido

- **Backend**: Node.js (NestJS o Express) o Python (FastAPI)
- **API**: GraphQL (Apollo Server o similar) desde Fase 2; REST simple en Fase 1
- **DBs**: PostgreSQL, MongoDB, Redis, Elasticsearch
- **Cola de mensajes**: RabbitMQ (o Redis Streams para empezar más simple)
- **Auth**: JWT (access + refresh)
- **Infra local**: Docker Compose (todos los servicios anteriores + API)
- **Hardening**: Nginx, Prometheus + Grafana, OpenTelemetry, k6

---

## 9. Preguntas abiertas / decisiones a tomar durante el desarrollo

- ¿El lock de Redis es por listado completo o por rango de fechas específico? (afecta granularidad de concurrencia permitida)
- ¿Qué pasa si falla la publicación del evento a la cola después de confirmar la reserva en Postgres? (¿outbox pattern?)
- ¿Cómo se versiona el esquema de `attributes` en MongoDB si se agregan nuevos tipos de listado más adelante?
- ¿La búsqueda debe incluir listados con reservas activas, o solo disponibilidad real (requeriría cruzar con Postgres)?
