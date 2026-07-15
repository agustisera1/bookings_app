-- up

-- Normalize legacy values before the status set is closed below. 'completed' is
-- no longer stored: an accepted stay whose end_date has passed is completed.
-- NOTE: this is one-way — the `down` section restores the schema, not these values.
UPDATE bookings SET status = 'accepted'
  WHERE status IN ('confirmed', 'paid', 'completed');

-- `status` was nullable with a default. A CHECK can't close the set on its own:
-- `NULL IN (...)` evaluates to NULL, and a CHECK only rejects an explicit FALSE,
-- so a NULL status would slip past booking_status_valid below.
UPDATE bookings SET status = 'pending' WHERE status IS NULL;
ALTER TABLE bookings ALTER COLUMN status SET NOT NULL;

ALTER TABLE bookings
  ADD COLUMN refund_amount REAL        NOT NULL DEFAULT 0,
  ADD COLUMN cancelled_by  VARCHAR(10),
  ADD COLUMN cancelled_at  TIMESTAMPTZ;

ALTER TABLE bookings ADD CONSTRAINT booking_status_valid
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

ALTER TABLE bookings ADD CONSTRAINT booking_cancelled_by_valid
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('guest', 'host'));

-- A cancelled booking always records who cancelled it and when; a live one
-- never carries those fields. Cancelling and recording the cancellation are the
-- same write, so a half-applied cancellation cannot be persisted.
ALTER TABLE bookings ADD CONSTRAINT booking_cancellation_fields
  CHECK (
    (status = 'cancelled'
      AND cancelled_by IS NOT NULL
      AND cancelled_at IS NOT NULL)
    OR
    (status <> 'cancelled'
      AND cancelled_by IS NULL
      AND cancelled_at IS NULL)
  );

-- down

ALTER TABLE bookings DROP CONSTRAINT booking_cancellation_fields;
ALTER TABLE bookings DROP CONSTRAINT booking_cancelled_by_valid;
ALTER TABLE bookings DROP CONSTRAINT booking_status_valid;

ALTER TABLE bookings ALTER COLUMN status DROP NOT NULL;

ALTER TABLE bookings
  DROP COLUMN cancelled_at,
  DROP COLUMN cancelled_by,
  DROP COLUMN refund_amount;
