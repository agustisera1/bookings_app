# 🏡 Greenaway

Marketplace de reservas de alojamientos (estilo Airbnb simplificado), construido como **proyecto de
aprendizaje de arquitectura**. Demuestra de punta a punta: persistencia políglota (PostgreSQL +
MongoDB + Redis), procesamiento asíncrono con colas y workers, entrega en tiempo real (SSE +
WebSocket) y una API GraphQL con autorización por rol y ownership.

Dos roles: **guest** (busca, reserva, reseña) y **host** (publica y gestiona listados y reservas). Un
usuario puede ser ambos.

> Corre local. El foco del proyecto está en la aplicación, no en operar infraestructura.

---

## 🚦 Estado

**Construido:** autenticación (JWT) y RBAC; listados en
MongoDB con múltiples tipos; reservas sin solapamiento; reseñas; API GraphQL (schema en proceso, sin endpoint HTTP);
notificaciones por email asíncronas (worker + BullMQ); chat host↔guest en vivo (socket.io);
notificaciones in-app (SSE); y rate limiting en el borde de autenticación.

**Entorno:** reproducible con Docker + seed (`pnpm infra:up`). La auditoría del sistema vive en
`docs/audit/` y la deuda técnica conocida, en `docs/tech-debt/`.

---

## 🏗️ Arquitectura

Dos procesos que comparten los mismos datastores:

```mermaid
flowchart LR
  U[Cliente] --> APP["greenaway<br/>Next.js · GraphQL · SSE"]
  U --> WRK["greenaway-worker<br/>socket.io · BullMQ"]
  APP -->|escribe el outbox| PG
  APP --> MG
  APP -->|pub/sub · rate limit| RD
  WRK --> PG & MG & RD
  subgraph Datos
    PG[(PostgreSQL)]
    MG[(MongoDB)]
    RD[(Redis)]
  end
```

- **`greenaway`** (este repo) — UI, API GraphQL, Server Actions y el borde SSE de notificaciones;
  registra el trabajo asíncrono como filas de outbox, en la misma transacción que la entidad.
- **`greenaway-worker`** (repo aparte) — el relay que publica el outbox en BullMQ, sus consumers
  (emails, notificaciones) y el servidor socket.io del chat. Es un proceso persistente (no serverless): sostiene conexiones y loops de larga
  vida, y ese requisito es lo que justifica el split app/worker.
- **PostgreSQL** — núcleo transaccional: usuarios, reservas, reseñas y el outbox.
- **MongoDB** — documentos heterogéneos: listados, chats, mensajes, notificaciones.
- **Redis** — colas (BullMQ), fan-out de sockets, rate limiting y pub/sub de las notificaciones SSE.

**Tiempo real:** SSE para notificaciones (mismo origen, dentro de Next) y socket.io para el chat (en el
worker). **Auth:** JWT en cookie httpOnly. El _por qué_ de estas decisiones
está en `docs/architecture/`.

---

## 📁 Estructura

```
app/            Rutas de Next.js (App Router) + route handlers (graphql, subscribe, s3)
components/     ui/ (shadcn) · common/ (primitivos propios) · <feature>/ (bookings, chat, search…)
lib/            <service>/ (auth, bookings, chat, listings, notifications, reviews, users) ·
                apollo/ (schema raíz y cliente) · infra/ (clientes de DB y servicios) · shared/
db/migrations/  Migraciones de PostgreSQL, generadas por drizzle-kit desde lib/*/tables.ts
docs/           ADRs, deuda técnica y auditoría
scripts/        Seeds y utilidades de datos
```

---

## 📦 Prerequisitos

- **Node.js 20+**, **pnpm** y **Docker** (con Compose)
- Para emails y chat en vivo: el repo **`greenaway-worker`** corriendo por separado

---

## 🚀 Cómo correrlo

```bash
pnpm install
cp .env.example .env.local      # completar PG · Mongo · Redis · JWT · S3
pnpm infra:up                   # Postgres, Mongo y Redis en Docker + schema + seed
pnpm dev
```

`infra:up` levanta los contenedores con las credenciales y puertos de `.env.local`, espera a que
estén sanos y corre `db:setup` y `db:seed`. Se puede correr de nuevo: el seed se saltea si ya hay
datos. Los puertos tienen que estar libres: un Postgres o un Mongo instalado en la máquina con el
mismo puerto choca con el contenedor. Mongo Express (UI de Mongo) queda en `http://localhost:8081`.

La app queda en `http://localhost:3000`. Con el seed, entrá como `lucia@greenaway.test` (host) o
`valentina@greenaway.test` (guest), contraseña `greenaway-demo`; el resto de los usuarios de prueba
está en `db/README.md`. Para emails y chat en vivo, correr `greenaway-worker` por
separado (ver su repo).

---

## ⚙️ Comandos

|                                                 |                                               |
| ----------------------------------------------- | --------------------------------------------- |
| `pnpm dev` / `build`                            | desarrollo / build de producción              |
| `pnpm lint` · `pnpm test`                       | linting · tests (Vitest)                      |
| `pnpm codegen`                                  | regenera los tipos de GraphQL desde el schema |
| `pnpm infra:up`                                 | infra en Docker + schema + seed               |
| `pnpm infra:down` · `infra:reset`               | baja la infra / la borra con sus datos y la levanta de cero |
| `pnpm db:setup`                                 | schema completo: `db:migrate` + `db:indexes`  |
| `pnpm db:generate` · `db:migrate`              | genera / aplica migraciones de PostgreSQL     |
| `pnpm db:indexes`                               | crea los índices de MongoDB                   |
| `pnpm db:seed` · `db:reset`                     | carga / borra los datos de demo               |

Detalle de migraciones, índices, seed y reset: `db/README.md`.

---

## 📚 Documentación

El README solo orienta; el detalle vive en `/docs` y `.claude/rules/`, organizado por **qué pregunta
responde cada uno**:

| Si querés…                                                | Andá a                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| entender **por qué** se tomó una decisión de arquitectura | `docs/architecture/` — ADRs (realtime, colas, rate limiting)                        |
| las **convenciones** para extender el código              | `.claude/rules/` — una regla por dimensión; índice en `CLAUDE.md`                   |
| qué es **deuda conocida**                                  | `docs/tech-debt/`                                                                   |

---

## 📄 Licencia

Sin licencia definida todavía: hasta que se agregue un archivo `LICENSE`, se reservan todos los
derechos. Elegir una es un pendiente para exponer el proyecto públicamente.

---

## 👤 Autor

**Agustín Tisera** — proyecto de portfolio. _(Contacto y links: a completar.)_
