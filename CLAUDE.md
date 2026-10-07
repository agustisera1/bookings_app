# Greenaway — CLAUDE.md

Marketplace de reservas de alojamientos (estilo Airbnb simplificado). Proyecto de portfolio y de estudio: persistencia políglota, procesamiento asíncrono, realtime y APIs GraphQL. Las soluciones son simples: cubren el caso probable y lo remoto va a "Limitaciones conocidas".

## Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Package manager**: pnpm
- **API**: GraphQL para lecturas, ejecutado en proceso desde los Server Components (Apollo Client + `SchemaLink`, sin endpoint HTTP); Server Actions para escrituras
- **DBs**: PostgreSQL (núcleo transaccional + outbox), MongoDB (listados, chat, notificaciones), Redis (colas, pub/sub, rate limiting)
- **Colas**: BullMQ sobre Redis; el worker vive en el repo `greenaway-worker`
- **Auth**: JWT (access token en cookie httpOnly)
- **Infra local**: Docker Compose (`docker-compose.yml`, credenciales de `.env.local`)

## Comandos

```bash
pnpm dev         # servidor de desarrollo
pnpm build       # build de producción
pnpm lint        # linting
pnpm test        # tests (una corrida)
pnpm test:watch  # tests en watch
pnpm codegen     # tipos de GraphQL
pnpm infra:up    # Postgres, Mongo y Redis en Docker + db:setup + db:seed (idempotente)
pnpm db:setup    # migraciones de PostgreSQL + índices de MongoDB (idempotente)
pnpm db:generate # migración desde los cambios en lib/*/tables.ts
pnpm db:seed     # datos de demo (pnpm db:reset --yes para volver a empezar)
```

Detalle de la base (migraciones, índices, seed, reset): `db/README.md`.

## Implementar sobre la guía oficial

Toda solución que use una librería o plataforma (React, Next, Apollo, socket.io, BullMQ, una spec web)
sigue el patrón que documenta su guía oficial. Aplica igual a un refactor y a la feature chica que nace
de arreglar otra cosa.

- **Antes de escribir código:** leer la sección de la guía que cubre el caso y nombrarla en la
  propuesta. Si la doc no lo dice, leer el código fuente o los tipos instalados en `node_modules`.
- **Si no hay patrón documentado, o la solución se aparta de él, es un parche:** frenar y consultarlo
  antes de implementarlo.
- **Al cerrar el cambio:** cada `useEffect`, estado manual o llamada imperativa nueva se justifica con
  la regla de `.claude/rules/` o la sección de la doc que la respalda. Para React: "Efectos y estado
  externo" en `07-frontend.md`.

## Reglas — `.claude/rules/`

**Antes de modificar código, leé las reglas de `.claude/rules/` de las dimensiones que toca la tarea y alineá el cambio con ellas.**

Un archivo por área. Las que tienen `paths:` se cargan solo al tocar archivos que matchean.

| Archivo | Cubre | Se carga |
|---|---|---|
| `02-services.md` | Estructura de un service, tipos, lecturas (GraphQL) y escrituras (actions), errores, repository | `lib/<service>/*`, `lib/apollo` |
| `03-api.md` | Criterios de contrato (común, REST/RPC, GraphQL, realtime) y tipos generados | Actions, resolvers, schemas, `lib/apollo`, `app/api`, socket, `codegen.ts` |
| `04-datos.md` | Modelo de datos de PostgreSQL y MongoDB | Repos, clientes de DB, `db/`, `scripts/` |
| `05-async.md` | Outbox, relay, colas BullMQ, idempotencia, runtime del worker y Redis como almacén de colas | `lib/outbox/`, repos |
| `07-frontend.md` | Capas de UI, tokens, primitivos, estados, efectos y estado externo, partición, forms, `ConfirmDialog` | `components/`, `app/**/*.tsx`, `globals.css` |

## Comentarios y docs

- **Comentarios:** solo lo que no se deduce del código, máximo 2 líneas por bloque (lo aplica el hook
  `.claude/hooks/check-comments.mjs`).
- **Docs:** `README.md` (qué es, cómo correrlo, limitaciones conocidas) y `db/README.md`. Una
  limitación nueva va a "Limitaciones conocidas" del README, no a un comentario.
