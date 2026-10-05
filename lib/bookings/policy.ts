/**
 * Booking lifecycle rules: which transitions are legal, and what a cancellation
 * refunds. Pure — no DB, no React — so the service and the UI ask the same question.
 *
 * Legal transitions:
 *   pending  → accepted  (host, owns the listing)
 *   pending  → rejected  (host, owns the listing)
 *   pending  → cancelled (guest)
 *   accepted → cancelled (guest or host)
 * `rejected` and `cancelled` are terminal.
 */
import type { Booking, BookingParty, BookingStatus, CancelActor } from "./types";

/** Statuses a booking can never leave. */
export const TERMINAL_STATUSES: BookingStatus[] = ["rejected", "cancelled"];

// Statuses that still hold the listing's dates: the positive form of `no_overlap`.
export const SLOT_HOLDING_STATUSES: BookingStatus[] = ["pending", "accepted"];

/** Guests cancelling within this window of check-in forfeit their refund. */
export const FREE_CANCELLATION_WINDOW_HOURS = 48;

const FREE_CANCELLATION_WINDOW_MS = FREE_CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

// A Date on the server, an ISO string off the wire: `new Date()` reads both.
type Timestamp = Date | string;

export type CancellableBooking = Pick<Booking, "status" | "total_price"> & {
  start_date: Timestamp;
};

export type CompletableBooking = Pick<Booking, "status"> & { end_date: Timestamp };

/** Someone's side of a booking, or null if they're party to it in neither direction. */
export function partyOf(
  booking: Pick<Booking, "guest_id">,
  userId: string,
  listingHostId: string | undefined,
): BookingParty | null {
  if (booking.guest_id === userId) return "guest";
  return listingHostId === userId ? "host" : null;
}

/** Cancelling as the host also takes the permission to manage bookings. */
export function cancelActorOf(party: BookingParty | null, canManage: boolean): CancelActor | null {
  if (party === "host" && !canManage) return null;
  return party;
}

export function isTerminal(status: BookingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * A stay that actually happened: the host accepted it and its end date has
 * passed. There is no `completed` status to read (see `BookingStatus`) — this
 * predicate *is* the definition, which is why reviewing gates on it rather than
 * on merely having booked.
 */
export function isCompleted(booking: CompletableBooking, now: Date): boolean {
  return (
    booking.status === "accepted" &&
    new Date(booking.end_date).getTime() < now.getTime()
  );
}

export function hasStarted(booking: CancellableBooking, now: Date): boolean {
  return new Date(booking.start_date).getTime() <= now.getTime();
}

/** The instant the guest's free-cancellation window closes. */
export function freeCancellationDeadline(booking: CancellableBooking): Date {
  return new Date(
    new Date(booking.start_date).getTime() - FREE_CANCELLATION_WINDOW_MS,
  );
}

/**
 * What a cancellation refunds, in the listing's currency.
 *
 * The host branch is the "a host can't cancel without refunding" rule: rather
 * than a precondition someone can forget to check, the full refund is what
 * cancelling as a host *means*, and the service writes it in the same UPDATE as
 * the status.
 */
export function refundFor(
  booking: CancellableBooking,
  actor: CancelActor,
  now: Date,
): number {
  // A request the host never accepted committed nothing, whenever it's dropped.
  if (booking.status === "pending") return booking.total_price;

  // The host broke a confirmed commitment: no forfeit window applies to them.
  if (actor === "host") return booking.total_price;

  const freeUntil = freeCancellationDeadline(booking).getTime();
  return now.getTime() < freeUntil ? booking.total_price : 0;
}

export type CancellationCheck =
  | { allowed: true; refundAmount: number }
  | { allowed: false; reason: string };

/**
 * Whether `actor` may cancel this booking right now, and what it refunds if so.
 *
 * `reason` is written to be shown to the user as-is: it's copy authored here,
 * never a database or runtime message.
 */
export function canCancel(
  booking: CancellableBooking,
  actor: CancelActor,
  now: Date,
): CancellationCheck {
  if (isTerminal(booking.status))
    return {
      allowed: false,
      reason:
        booking.status === "cancelled"
          ? "This booking is already cancelled"
          : "This booking was rejected and can no longer be cancelled",
    };

  // A host answers a request with accept/reject. Cancelling is only for a stay
  // they already confirmed.
  if (actor === "host" && booking.status === "pending")
    return {
      allowed: false,
      reason: "Reject this request instead of cancelling it",
    };

  if (hasStarted(booking, now))
    return {
      allowed: false,
      reason:
        "This stay has already started and can no longer be cancelled. Contact support to open a dispute.",
    };

  return { allowed: true, refundAmount: refundFor(booking, actor, now) };
}
