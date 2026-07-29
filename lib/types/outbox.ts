/**
 * Contrato de una fila del outbox. El service decide el `type` (es vocabulario
 * de dominio) y el repo la escribe en la misma transacción que la entidad.
 *
 * El `payload` es *thin* — sólo ids: el relay rehidrata contra la DB al
 * publicar. Meter acá lo que el mail renderiza congelaría el contrato de la cola
 * dentro de Postgres. Ver `docs/insights/OUTBOX_AND_SAGA.md`.
 *
 * Agregar un miembro a `OutboxEventType` obliga a enseñárselo al `toJobs` del
 * worker: un tipo que no conoce se descarta con un log.
 */
export type OutboxEventType =
  | "booking.created"
  | "booking.accepted"
  | "booking.rejected"
  | "booking.cancelled"
  | "user.registered";

export type OutboxEvent = {
  type: OutboxEventType;
  // Opcional: hay eventos que no necesitan más que el `aggregate_id` para que el
  // relay rehidrate. Los repos lo escriben como `{}` cuando falta.
  payload?: Record<string, unknown>;
};
