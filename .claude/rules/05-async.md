---
paths:
  - "lib/services/**"
  - "lib/repositories/**"
  - "lib/types/outbox.ts"
---

# Async / eventos (dimensión 5)

> **Colas / workers (BullMQ + Redis):** antes de agregar un job processor o un evento asíncrono, leer `docs/architecture/BULLMQ_QUEUES.md`. **Esta app ya no encola**: los services escriben una fila de `outbox` en la misma transacción que la entidad, y el relay del worker es quien publica. El contrato del payload vive sólo en el repo del worker.
