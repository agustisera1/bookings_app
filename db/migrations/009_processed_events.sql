-- up

CREATE TABLE processed_events (
  event_id     UUID        NOT NULL REFERENCES outbox (id) ON DELETE CASCADE,
  -- Parte de la clave porque una fila del outbox fanea a varios consumers: sin
  -- `consumer`, el primero en claimear dejaría afuera al resto de los efectos.
  consumer     VARCHAR(40) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, consumer)
);

-- down

DROP TABLE IF EXISTS processed_events;
