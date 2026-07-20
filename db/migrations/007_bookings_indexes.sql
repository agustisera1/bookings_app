-- up

-- El `WHERE` replica literal (y con constantes) el de `findBookedListingIds`: un
-- índice parcial solo se usa si el WHERE de la query implica el suyo, y Postgres
-- no razona sobre parámetros ni expresiones equivalentes.
CREATE INDEX bookings_daterange_gist
  ON bookings USING gist (tstzrange(start_date, end_date, '[]'))
  WHERE status NOT IN ('cancelled', 'rejected');

-- `guest_fk` (001) no crea índice: una FK nunca indexa la columna referenciante.
CREATE INDEX bookings_guest_id_idx ON bookings (guest_id);

-- No lo cubre el GiST de `no_overlap` pese a tener listing_id como columna líder:
-- ese índice es parcial y estas queries no filtran por status, así que no lo implican.
CREATE INDEX bookings_listing_id_idx ON bookings (listing_id);

-- down

DROP INDEX bookings_listing_id_idx;
DROP INDEX bookings_guest_id_idx;
DROP INDEX bookings_daterange_gist;
