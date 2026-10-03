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

// Typed against the fields the rules read, so list and detail rows both satisfy it.
type CancellableFields = Pick<
  BookingRow,
  "status" | "start_date" | "total_price"
>;

// Dates arrive as epoch-millis strings, which `new Date(string)` reads as Invalid Date.
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
