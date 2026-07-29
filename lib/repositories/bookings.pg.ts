import * as db from "../postgres";
import type { Booking, BookingStatus } from "../types/booking";
import type { OutboxEvent } from "../types/outbox";

export async function findBookingsByGuestId(
  guestId: string,
): Promise<Booking[]> {
  const result = await db.query<Booking>(
    `SELECT * FROM bookings WHERE guest_id = $1`,
    [guestId],
  );
  return result.rows;
}

// Same CTE trick as `rotateSession`: one statement is one transaction, so the
// booking and its outbox row land together or not at all. The outbox INSERT
// selects from the first CTE, which is what makes it see the generated id.
export async function createBookingRecord(
  params: {
    listingId: string;
    guestId: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    guests: number;
  },
  event: OutboxEvent,
): Promise<{ id: string; created_at: string } | null> {
  const result = await db.query<{ id: string; created_at: string }>(
    `WITH new_booking AS (
       INSERT INTO bookings (listing_id, guest_id, start_date, end_date, total_price, guests)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, created_at
     ), outbox_event AS (
       INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       SELECT 'booking', new_booking.id::text, $7, $8::jsonb
       FROM new_booking
     )
     SELECT id, created_at FROM new_booking`,
    [
      params.listingId,
      params.guestId,
      params.checkIn,
      params.checkOut,
      params.totalPrice,
      params.guests,
      event.type,
      event.payload ?? {},
    ],
  );
  return result.rows[0] ?? null;
}

export async function hasGuestBookingForListing(
  guestId: string,
  listingId: string,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM bookings WHERE guest_id = $1 AND listing_id = $2 LIMIT 1`,
    [guestId, listingId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getBookingById(
  bookingId: string,
): Promise<Booking | null> {
  const result = await db.query<Booking>(
    `SELECT * FROM bookings WHERE id = $1`,
    [bookingId],
  );
  return result.rows[0] ?? null;
}

export async function getBookingsByListingIds(
  ids: string[],
): Promise<Booking[]> {
  const result = await db.query<Booking>(
    `SELECT * FROM bookings
    WHERE listing_id = ANY($1)`,
    [ids],
  );

  return result.rows;
}

export async function getBookingsByListingId(
  listing_id: string,
): Promise<Booking[]> {
  const result = await db.query<Booking>(
    `
    SELECT * FROM bookings
    WHERE listing_id = $1
    `,
    [listing_id],
  );

  return result.rows;
}

export async function getBookingRangesByListingId(
  listingId: string,
  statuses: BookingStatus[],
): Promise<Pick<Booking, "start_date" | "end_date">[]> {
  const result = await db.query<Pick<Booking, "start_date" | "end_date">>(
    `SELECT start_date, end_date FROM bookings
    WHERE listing_id = $1 AND status = ANY($2)`,
    [listingId, statuses],
  );

  return result.rows;
}

type UpdateBookingFields = Pick<
  Booking,
  | "status"
  | "status_reason"
  | "start_date"
  | "end_date"
  | "guests"
  | "total_price"
  | "refund_amount"
  | "cancelled_by"
  | "cancelled_at"
>;
export async function updateBooking(
  booking_id: string,
  values: Partial<UpdateBookingFields>,
  event: OutboxEvent,
) {
  const entries = Object.entries(values);
  if (entries.length === 0) return false;

  const setClause = entries
    .map(([key], index) => `${key} = $${index + 1}`)
    .join(", ");
  const params = entries.map(([, val]) => val);
  const id = entries.length + 1;

  const result = await db.query(
    `
    WITH updated AS (
      UPDATE bookings
      SET ${setClause}
      WHERE id = $${id}
      RETURNING id
    ), outbox_event AS (
      INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
      SELECT 'booking', updated.id::text, $${id + 1}, $${id + 2}::jsonb
      FROM updated
    )
    SELECT id FROM updated
    `,
    [...params, booking_id, event.type, event.payload ?? {}],
  );

  return (result.rowCount ?? 0) > 0;
}

// Listing ids that are unavailable within [from, to]: any booking whose date
// range overlaps the requested one. Mirrors the DB exclusion constraint in
// 003_booking_no_overlap.sql — inclusive bounds (`[]`) and ignoring bookings
// that no longer hold the slot (cancelled/rejected).
export async function findBookedListingIds(
  from: string,
  to: string,
): Promise<string[]> {
  const result = await db.query<{ listing_id: string }>(
    `
    SELECT DISTINCT listing_id FROM bookings
    WHERE status NOT IN ('cancelled', 'rejected')
      AND tstzrange(start_date, end_date, '[]')
          && tstzrange($1::timestamptz, $2::timestamptz, '[]')
    `,
    [from, to],
  );
  return result.rows.map((row) => row.listing_id);
}
