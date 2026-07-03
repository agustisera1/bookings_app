-- up

ALTER TABLE bookings ADD COLUMN status_reason VARCHAR(256);

-- down

ALTER TABLE bookings DROP COLUMN status_reason;
