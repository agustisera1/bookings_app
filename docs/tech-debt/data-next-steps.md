# data-next-steps.md — Deuda estructural de la capa de datos

## 1. `outbox` y `processed_events` no tienen limpieza

- **Dónde:** `lib/outbox/tables.ts`.

- **Qué pasa:** el relay marca `published_at` pero nunca borra la fila, y cada consumer deja una
  fila en `processed_events` por evento. Las dos tablas solo crecen.

- **Por qué duele:** no afecta al relay, que lee las pendientes por un índice parcial. El costo es
  disco y backups, y aparece con volumen. Una fila de `processed_events` solo protege mientras
  BullMQ puede reintentar el job; pasado eso no evita nada.

- **Idea de fix:** una limpieza periódica. El criterio de qué es borrable está por definir; puede
  depender de la reserva (p. ej. los eventos de una estadía que ya terminó). Borrar del outbox limpia
  `processed_events` en cascada por la FK.

## 2. Las colecciones de Mongo no tienen validator

- **Dónde:** `chats`, `messages`, `read_cursors` y `notifications`.

- **Qué pasa:** Mongo acepta cualquier documento: un campo faltante o con otro tipo se descubre
  recién al leerlo.

- **Idea de fix:** un `$jsonSchema` por colección (campos requeridos y tipos BSON) en el script de
  `db:indexes`, con `validationLevel: "strict"`. Criterio M4 de `.claude/rules/04-datos.md`.
