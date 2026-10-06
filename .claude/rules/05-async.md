---
paths:
  - "lib/services/**"
  - "lib/repositories/**"
  - "lib/types/outbox.ts"
---

# Async / eventos (dimensión 5)

> **Desactualizada.** Describe el estado previo a la auditoría de esta dimensión y puede contradecir el código. Ante una diferencia, mandan el código y las reglas ya auditadas (`02-services.md`, `07-frontend.md`).

> **Colas / workers (BullMQ + Redis):** antes de agregar un job processor o un evento asíncrono, leer `greenaway-worker/docs/architecture/bullmq-queues.md`. **Esta app ya no encola**: los services escriben una fila de `outbox` en la misma transacción que la entidad, y el relay del worker es quien publica. El contrato del payload vive sólo en el repo del worker.
