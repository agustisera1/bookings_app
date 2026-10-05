import type {
  GetBookingQuery,
  GetUserBookingsQuery,
} from "@/lib/apollo/__generated__/operations";

/** A booking as the trips list reads it: the lean selection. */
export type BookingRow = NonNullable<
  NonNullable<GetUserBookingsQuery["guestBookings"]>[number]
>;

/** The same booking with everything the detail route asks for. */
export type BookingDetailRow = NonNullable<GetBookingQuery["booking"]>;
