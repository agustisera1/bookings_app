import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/infra/postgres";
import { insertOutboxEvent } from "@/lib/outbox/repository";
import type { OutboxEvent } from "@/lib/outbox/types";
import { bookings } from "./tables";
import type { BookedRange, Booking, BookingStatus, BookingUpdate, NewBooking } from "./types";

export async function findBookingById(id: string): Promise<Booking | null> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
  return booking ?? null;
}

export async function findBookingsByGuestId(guestId: string, limit: number): Promise<Booking[]> {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.guest_id, guestId))
    .orderBy(desc(bookings.start_date))
    .limit(limit);
}

export async function findBookingsByListingIds(
  listingIds: string[],
  limit: number,
): Promise<Booking[]> {
  if (listingIds.length === 0) return [];
  return db
    .select()
    .from(bookings)
    .where(inArray(bookings.listing_id, listingIds))
    .orderBy(desc(bookings.start_date))
    .limit(limit);
}

export async function findBookedRangesByListingIds(
  listingIds: string[],
  statuses: BookingStatus[],
): Promise<(BookedRange & Pick<Booking, "listing_id">)[]> {
  if (listingIds.length === 0) return [];
  return db
    .select({
      listing_id: bookings.listing_id,
      start_date: bookings.start_date,
      end_date: bookings.end_date,
    })
    .from(bookings)
    .where(and(inArray(bookings.listing_id, listingIds), inArray(bookings.status, statuses)));
}

export async function findBookingForStay(
  stay: Pick<Booking, "listing_id" | "guest_id" | "start_date" | "end_date">,
  statuses: BookingStatus[],
): Promise<Pick<Booking, "id" | "created_at"> | null> {
  const [booking] = await db
    .select({ id: bookings.id, created_at: bookings.created_at })
    .from(bookings)
    .where(
      and(
        eq(bookings.listing_id, stay.listing_id),
        eq(bookings.guest_id, stay.guest_id),
        eq(bookings.start_date, stay.start_date),
        eq(bookings.end_date, stay.end_date),
        inArray(bookings.status, statuses),
      ),
    );
  return booking ?? null;
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
  expectedStatus: BookingStatus,
  values: BookingUpdate,
  event: OutboxEvent,
): Promise<boolean> {
  if (Object.keys(values).length === 0) return false;

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(bookings)
      .set(values)
      .where(and(eq(bookings.id, id), eq(bookings.status, expectedStatus)))
      .returning({ id: bookings.id });
    if (updated.length === 0) return false;
    await insertOutboxEvent(tx, { type: "booking", id }, event);
    return true;
  });
}
