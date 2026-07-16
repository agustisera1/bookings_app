-- up

-- Money was floating point: `total_price` has been REAL (float4, ~7 significant
-- digits) since 001, and 004 deliberately added `refund_amount` as REAL to stay
-- consistent within the table so one migration converts both together (this one).
-- NUMERIC(10,2) matches the spec (docs/PROYECTO_B_MARKETPLACE.md — `numeric
-- total_price`) and is exact. Existing float noise rounds to 2 decimals in the cast.
--
-- Side effect on the app: node-postgres returns NUMERIC as *string* (it parsed
-- REAL with parseFloat into number), which makes `Booking.total_price: string`
-- finally true and flips `Booking.refund_amount` to string.
ALTER TABLE bookings
  ALTER COLUMN total_price   TYPE NUMERIC(10,2),
  ALTER COLUMN refund_amount TYPE NUMERIC(10,2);

-- down

ALTER TABLE bookings
  ALTER COLUMN total_price   TYPE REAL,
  ALTER COLUMN refund_amount TYPE REAL;
