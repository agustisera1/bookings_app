import type { GetUserBookingsQuery } from "@/lib/apollo/__generated__/operations";
import type { CancellableBooking } from "@/lib/bookings/policy";
import { parseTs } from "@/lib/dates";

/** A booking as every piece of the feature consumes it: the GraphQL row. */
export type BookingRow = NonNullable<
  NonNullable<GetUserBookingsQuery["guestBookings"]>[number]
>;

// The dates arrive as epoch-millis strings (GraphQL `String` serializes a PG
// `Date` through `valueOf()`), which `new Date(string)` reads as `Invalid
// Date`. `parseTs` is what keeps the rules answerable.
export function toCancellableRow(booking: BookingRow): CancellableBooking {
  return {
    status: booking.status ?? "pending",
    startDate: parseTs(booking.start_date)?.toISOString() ?? "",
    totalPrice: booking.total_price ?? 0,
  };
}
