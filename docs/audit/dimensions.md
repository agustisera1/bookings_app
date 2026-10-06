# Auditoría del sistema — dimensiones

La auditoría se hace por partes: una dimensión por vez, cada una en su branch `refactor/*` y con un criterio definido de antemano (p. ej. "arquitectura hexagonal").

| # | Dimensión | Qué abarca |
|---|---|---|
| 1 | **Dominio** | Reglas de negocio puras (`policy.ts`), entidades, invariantes, dónde vive cada regla |
| 2 | **Backend / servicios** | Services, repos, capas y dependencias |
| 3 | **Contrato de API** | Schema GraphQL, Server Actions, route handlers, forma de errores (`ServiceResult`) |
| 4 | **Datos / persistencia** | Esquemas PG y Mongo, índices, constraints, migraciones, consistencia entre bases |
| 5 | **Async / eventos** | Outbox, relay, colas BullMQ, workers, idempotencia, reintentos |
| 6 | **Realtime** | SSE, socket.io, pub/sub Redis, reconexión |
| 7 | **Frontend / UI / UX** | Componentes, capas `ui → common → feature`, estados, forms, accesibilidad |
| 8 | **Infra / networking / caching** | Redis, cache de Next, rate limiting, S3, config de entorno |
| 9 | **Seguridad** | Auth JWT, RBAC/ownership, validación de input, secretos |
| 10 | **Observabilidad** | Logs, manejo de errores inesperados, trazas, métricas |
| 11 | **Testing** | Qué se testea, en qué capa, qué huecos hay |
| 12 | **DX / tooling** | Lint, tsc, codegen, hooks, scripts, CI |
| 13 | **Docs / gobierno** | CLAUDE.md y `.claude/rules/`, diagramas, tech-debt — y que coincidan con el código |

Las dimensiones 1 a 5 son las más acopladas entre sí: un criterio de arquitectura cambia la forma de 1, 2, 3 y 5 a la vez, así que conviene auditarlas juntas o en ese orden.
