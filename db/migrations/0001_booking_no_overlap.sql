-- Drizzle can't model EXCLUDE: no two live bookings of a listing overlap, even under concurrency (RNF-01).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "no_overlap"
  EXCLUDE USING gist (
    listing_id WITH =,
    tstzrange(start_date, end_date, '[]') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'rejected'));
