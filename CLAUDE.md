# Greenaway — CLAUDE.md

Marketplace de reservas de alojamientos (estilo Airbnb simplificado). Objetivo de aprendizaje: persistencia políglota, procesamiento asíncrono y APIs GraphQL.

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

Las directivas viven en un archivo por dimensión (numeradas como en `docs/audit/dimensions.md`). Las que tienen `paths:` se cargan solo al tocar archivos que matchean. Para escribir una regla nueva: `docs/audit/how-to-add-rule.md`.

| Archivo | Cubre | Se carga |
|---|---|---|
| `00-convenciones.md` | `/lib` y DRY, cohesión/acoplamiento, tipos, comentarios | Siempre |
| `01-dominio.md` | Roles, reglas clave (RNF), reglas puras compartidas | Siempre |
| `02-services.md` | Estructura de un service, tipos, lecturas (GraphQL) y escrituras (actions), errores, repository | `lib/<service>/*`, `lib/apollo` |
| `03-api.md` | Criterios de contrato (común, REST/RPC, GraphQL, realtime) y tipos generados | Actions, resolvers, schemas, `lib/apollo`, `app/api`, socket, `codegen.ts` |
| `04-datos.md` | Modelo de datos de PostgreSQL y MongoDB | Repos, clientes de DB, `db/`, `scripts/` |
| `05-async.md` | Outbox y colas | Services, repos, `lib/types/outbox.ts` |
| `07-frontend.md` | Capas de UI, tokens, primitivos, estados, efectos y estado externo, partición, forms, `ConfirmDialog` | `components/`, `app/**/*.tsx`, `globals.css` |
| `09-seguridad.md` | Cómo fluye la identidad (cookies, `authorize`) | Auth, JWT, permisos, rate limit, `app/api` |
| `11-testing.md` | Qué se testea y cómo (capa pura, services) | `*.test.ts`, `vitest.config.ts` |
| `13-docs.md` | `/docs`, sincronía de documentación, deuda técnica | Siempre |
