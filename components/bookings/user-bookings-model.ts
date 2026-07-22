import type { GetUserBookingsQuery } from "@/lib/apollo/__generated__/operations";
import { parseTs } from "@/lib/dates";

export type BookingRow = NonNullable<
  NonNullable<GetUserBookingsQuery["guestBookings"]>[number]
>;

function endTime(b: BookingRow) {
  return parseTs(b.end_date)?.getTime() ?? 0;
}
function startTime(b: BookingRow) {
  return parseTs(b.start_date)?.getTime() ?? 0;
}

// Upcoming (soonest first) on top, past trips (most recent first) below.
export function partitionBookings(
  bookings: BookingRow[],
  now: number,
): { upcoming: BookingRow[]; past: BookingRow[] } {
  const upcoming = bookings
    .filter((b) => endTime(b) >= now)
    .sort((a, b) => startTime(a) - startTime(b));
  const past = bookings
    .filter((b) => endTime(b) < now)
    .sort((a, b) => endTime(b) - endTime(a));
  return { upcoming, past };
}
