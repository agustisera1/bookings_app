import * as db from "../postgres";
import type { Booking } from "../types/booking";

export async function findBookingsByGuestId(guestId: string): Promise<Booking[]> {
  const result = await db.query<Booking>(
    `SELECT * FROM bookings WHERE guest_id = $1`,
    [guestId],
  );
  return result.rows;
}

export async function createBookingRecord(params: {
  listingId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  guests: number;
}): Promise<{ id: string; created_at: string } | null> {
  const result = await db.query<{ id: string; created_at: string }>(
    `INSERT INTO bookings (listing_id, guest_id, start_date, end_date, total_price, guests)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, created_at`,
    [
      params.listingId,
      params.guestId,
      params.checkIn,
      params.checkOut,
      params.totalPrice,
      params.guests,
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
