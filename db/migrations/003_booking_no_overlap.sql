-- up

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    listing_id WITH =,
    tstzrange(start_date, end_date, '[]') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'rejected'));

-- down

ALTER TABLE bookings DROP CONSTRAINT no_overlap;
