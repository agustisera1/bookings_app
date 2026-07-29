-- up

CREATE TABLE outbox (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(40) NOT NULL,
  -- Ni UUID ni FK a propósito: la misma tabla referencia bookings (UUID) y, más
  -- adelante, listings (ObjectId de Mongo). Una FK ataría el outbox a una sola
  -- entidad y un `ON DELETE CASCADE` borraría el evento que falta publicar.
  aggregate_id   VARCHAR(36) NOT NULL,
  event_type     VARCHAR(60) NOT NULL,
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at   TIMESTAMPTZ
);

-- Parcial sobre las pendientes, que en régimen son casi ninguna: la tabla crece
-- sin límite hasta que se purgue, pero el índice que el relay consulta no.
-- `created_at` ordena el escaneo: el relay publica de la más vieja a la más nueva.
CREATE INDEX outbox_pending_idx
  ON outbox (created_at)
  WHERE published_at IS NULL;

-- down

DROP TABLE IF EXISTS outbox;
