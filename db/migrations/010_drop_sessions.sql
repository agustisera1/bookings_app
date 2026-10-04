-- up

-- Only backed the refresh token, which was removed. One-way: `down` restores
-- the table empty (001's definition), not the sessions it held.
DROP TABLE sessions;

-- down

CREATE TABLE sessions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL,
  token_hash VARCHAR(256) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL DEFAULT (now() + INTERVAL '30 days')
);
