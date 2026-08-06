import type {
  GetBookingQuery,
  GetUserBookingsQuery,
} from "@/lib/apollo/__generated__/operations";
import type {
  CancellableBooking,
  CompletableBooking,
} from "@/lib/bookings/policy";
import { parseTs } from "@/lib/dates";

/** A booking as the trips list reads it: the lean selection. */
export type BookingRow = NonNullable<
  NonNullable<GetUserBookingsQuery["guestBookings"]>[number]
>;

/** The same booking with everything the detail route asks for. */
export type BookingDetailRow = NonNullable<GetBookingQuery["booking"]>;

/**
 * Typed against the fields the rules read rather than a whole row, so the list
 * row and the detail row both satisfy it without either one owning the shape.
 */
type CancellableFields = Pick<
  BookingRow,
  "status" | "start_date" | "total_price"
>;

// The dates arrive as epoch-millis strings (GraphQL `String` serializes a PG
// `Date` through `valueOf()`), which `new Date(string)` reads as `Invalid
// Date`. `parseTs` is what keeps the rules answerable.
export function toCancellableRow(
  booking: CancellableFields,
): CancellableBooking {
  return {
    status: booking.status ?? "pending",
    startDate: parseTs(booking.start_date)?.toISOString() ?? "",
    totalPrice: booking.total_price ?? 0,
  };
}

type CompletableFields = Pick<BookingRow, "status" | "end_date">;

export function toCompletableRow(
  booking: CompletableFields,
): CompletableBooking {
  return {
    status: booking.status ?? "pending",
    endDate: parseTs(booking.end_date)?.toISOString() ?? "",
  };
}
