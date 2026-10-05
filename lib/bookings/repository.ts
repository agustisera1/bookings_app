import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/infra/postgres";
import { insertOutboxEvent } from "@/lib/outbox/repository";
import type { OutboxEvent } from "@/lib/outbox/types";
import { bookings } from "./tables";
import type { BookedRange, Booking, BookingStatus, BookingUpdate, NewBooking } from "./types";

export async function findBookingById(id: string): Promise<Booking | null> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
  return booking ?? null;
}

export async function findBookingsByGuestId(guestId: string): Promise<Booking[]> {
  return db.select().from(bookings).where(eq(bookings.guest_id, guestId));
}

export async function findBookingsByListingId(listingId: string): Promise<Booking[]> {
  return db.select().from(bookings).where(eq(bookings.listing_id, listingId));
}

export async function findBookingsByListingIds(listingIds: string[]): Promise<Booking[]> {
  if (listingIds.length === 0) return [];
  return db.select().from(bookings).where(inArray(bookings.listing_id, listingIds));
}

export async function findBookedRanges(
  listingId: string,
  statuses: BookingStatus[],
): Promise<BookedRange[]> {
  return db
    .select({ start_date: bookings.start_date, end_date: bookings.end_date })
    .from(bookings)
    .where(and(eq(bookings.listing_id, listingId), inArray(bookings.status, statuses)));
}

// Listings with a booking overlapping [from, to] (inclusive, like `no_overlap`).
// The statuses are inlined, not bound: the partial index is only used when this WHERE implies its own.
export async function findBookedListingIds(
  from: string,
  to: string,
  releasingStatuses: BookingStatus[],
): Promise<string[]> {
  const excluded = sql.raw(
    releasingStatuses.filter((status) => /^[a-z]+$/.test(status)).map((s) => `'${s}'`).join(", "),
  );
  const rows = await db
    .selectDistinct({ listing_id: bookings.listing_id })
    .from(bookings)
    .where(
      sql`status NOT IN (${excluded})
        AND tstzrange(start_date, end_date, '[]') && tstzrange(${from}::timestamptz, ${to}::timestamptz, '[]')`,
    );
  return rows.map((row) => row.listing_id);
}

export async function insertBooking(
  booking: NewBooking,
  event: OutboxEvent,
): Promise<Pick<Booking, "id" | "created_at">> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(bookings)
      .values(booking)
      .returning({ id: bookings.id, created_at: bookings.created_at });
    await insertOutboxEvent(tx, { type: "booking", id: created.id }, event);
    return created;
  });
}

export async function updateBooking(
  id: string,
  values: BookingUpdate,
  event: OutboxEvent,
): Promise<boolean> {
  if (Object.keys(values).length === 0) return false;

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(bookings)
      .set(values)
      .where(eq(bookings.id, id))
      .returning({ id: bookings.id });
    if (updated.length === 0) return false;
    await insertOutboxEvent(tx, { type: "booking", id }, event);
    return true;
  });
}
