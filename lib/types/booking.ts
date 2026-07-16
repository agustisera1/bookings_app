/**
 * The closed set of states a booking can be in. `completed` is deliberately
 * absent: it's derived from an accepted stay whose end date has passed, not
 * stored. See `isCompleted` in `lib/bookings/policy.ts`.
 *
 * Mirrors the `booking_status_valid` CHECK in
 * db/migrations/004_booking_cancellation.sql.
 */
export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled";

/**
 * The two parties to a booking. An account can be both guest and host (RF-02),
 * so this expresses someone's relationship to *this* booking, not their roles.
 */
export type BookingParty = "guest" | "host";

/** Who cancelled a booking. Persisted in `cancelled_by`. */
export type CancelActor = BookingParty;

export type Booking = {
  id: string;
  listing_id: string;
  guest_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  status_reason: string | null;
  // Money columns are NUMERIC(10,2) (005), which node-postgres returns as
  // strings to avoid float precision loss. Consumers convert at the edge.
  total_price: string;
  created_at: string;
  guests: number;
  refund_amount: string;
  cancelled_by: CancelActor | null;
  cancelled_at: string | null;
};

// View model: zipped data between a booking row and its listing document.
export type GuestBooking = {
  type: string;
  title: string;
  photos: string[];
  created_at: string; // Reservation date
  start_date: string;
  end_date: string;
  status: BookingStatus;
  total_price: number;
  id: string;
  guests: number;
};
