import type { Listing } from "@/lib/listings/types";
import type { bookings } from "./tables";

// Mirrors the `booking_status_valid` CHECK. `completed` is derived, see `isCompleted`.
export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled";

// Someone's side of *this* booking, not their roles: an account can be both.
export type BookingParty = "guest" | "host";

/** Who cancelled a booking. Persisted in `cancelled_by`. */
export type CancelActor = BookingParty;

export type Booking = typeof bookings.$inferSelect;

export type NewBooking = Pick<
  typeof bookings.$inferInsert,
  "listing_id" | "guest_id" | "start_date" | "end_date" | "total_price" | "guests"
>;

export type BookingUpdate = Partial<
  Pick<Booking, "status" | "status_reason" | "refund_amount" | "cancelled_by" | "cancelled_at">
>;

export type BookedRange = Pick<Booking, "start_date" | "end_date">;

// A booking as GraphQL resolves it: the caller's side, and its listing when the query loaded it.
export type BookingNode = Booking & { party: BookingParty; listing?: Listing | null };
