-- up

CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(80)  NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  name          VARCHAR(80)  NOT NULL,
  is_host       BOOLEAN      DEFAULT false,
  is_admin      BOOLEAN      DEFAULT false,
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_email UNIQUE (email)
);

CREATE TABLE sessions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL,
  token_hash VARCHAR(256) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE TABLE bookings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  VARCHAR(24) NOT NULL,
  guest_id    UUID        NOT NULL,
  start_date  TIMESTAMPTZ NOT NULL,
  end_date    TIMESTAMPTZ NOT NULL,
  status      VARCHAR(80) DEFAULT 'pending',
  total_price REAL        NOT NULL,
  guests      SMALLINT    NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT guest_fk FOREIGN KEY (guest_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE reviews (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  VARCHAR(24)  NOT NULL,
  author_name VARCHAR(60),
  rating      SMALLINT     DEFAULT 5,
  comment     VARCHAR(256) NOT NULL,
  host_reply  VARCHAR(256),
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- down

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
