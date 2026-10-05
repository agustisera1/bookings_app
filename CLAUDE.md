# Greenaway — CLAUDE.md

Marketplace de reservas de alojamientos (estilo Airbnb simplificado). Objetivo de aprendizaje: persistencia políglota, procesamiento asíncrono y APIs GraphQL.

## Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Package manager**: pnpm
- **API**: GraphQL (Apollo Server) para lecturas; Server Actions para escrituras
- **DBs**: PostgreSQL (núcleo transaccional + outbox), MongoDB (listados, chat, notificaciones), Redis (colas, pub/sub, rate limiting)
- **Colas**: BullMQ sobre Redis; el worker vive en el repo `greenaway-worker`
- **Auth**: JWT (access token en cookie httpOnly)
- **Infra local**: Docker Compose

## Comandos

```bash
pnpm dev         # servidor de desarrollo
pnpm build       # build de producción
pnpm lint        # linting
pnpm test        # tests (una corrida)
pnpm test:watch  # tests en watch
pnpm codegen     # tipos de GraphQL
pnpm db:migrate  # migraciones de PostgreSQL
```

## Reglas — `.claude/rules/`

**Antes de modificar código, leé las reglas de `.claude/rules/` de las dimensiones que toca la tarea y alineá el cambio con ellas.**

Las directivas viven en un archivo por dimensión (numeradas como en `docs/audit/DIMENSIONS.md`). Las que tienen `paths:` se cargan solo al tocar archivos que matchean. Para escribir una regla nueva: `docs/audit/HOW_TO_ADD_RULE.md`.

| Archivo | Cubre | Se carga |
|---|---|---|
| `00-convenciones.md` | `/lib` y DRY, cohesión/acoplamiento, tipos, comentarios | Siempre |
| `01-dominio.md` | Roles, reglas clave (RNF), reglas puras compartidas | Siempre |
| `02-services.md` | Estructura de un service, tipos, lecturas (GraphQL) y escrituras (actions), errores, repository | `lib/<service>/*`, `lib/apollo` |
| `03-api.md` | Tipos generados de GraphQL y de dónde importarlos | `lib/apollo`, `app/api/graphql`, `codegen.ts` |
| `04-datos.md` | Modelo de datos de PostgreSQL y MongoDB | Repos, clientes de DB, `db/`, `scripts/` |
| `05-async.md` | Outbox y colas | Services, repos, `lib/types/outbox.ts` |
| `07-frontend.md` | Capas de UI, tokens, primitivos, estados, partición, forms, `ConfirmDialog` | `components/`, `app/**/*.tsx`, `globals.css` |
| `09-seguridad.md` | Cómo fluye la identidad (cookies, `authorize`) | Auth, JWT, permisos, rate limit, `app/api` |
| `11-testing.md` | Qué se testea y cómo (capa pura, services) | `*.test.ts`, `vitest.config.ts` |
| `13-docs.md` | `/docs`, sincronía de documentación, deuda técnica | Siempre |
