/**
 * Booking lifecycle rules: which transitions are legal, and what a cancellation
 * refunds. Pure by design — no DB, no React, no framework — so both the service
 * (`lib/services/bookings.ts`) and the UI can ask the same question and get the
 * same answer, and so the rules are testable without standing anything up.
 *
 * Legal transitions:
 *   pending  → accepted  (host, owns the listing)
 *   pending  → rejected  (host, owns the listing)
 *   pending  → cancelled (guest)
 *   accepted → cancelled (guest or host)
 * `rejected` and `cancelled` are terminal.
 */
import type { Booking, BookingStatus, CancelActor } from "../types/booking";

/** Statuses a booking can never leave. */
export const TERMINAL_STATUSES: BookingStatus[] = ["rejected", "cancelled"];

/** Guests cancelling within this window of check-in forfeit their refund. */
export const FREE_CANCELLATION_WINDOW_HOURS = 48;

const FREE_CANCELLATION_WINDOW_MS =
  FREE_CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * The booking fields the rules below actually read. Plain and normalized rather
 * than `Pick<Booking, …>`: the same predicate runs against a PG row and a
 * GraphQL row, whose field names and price types differ, so neither shape gets
 * to define the contract. Mirrors the convention that services take plain
 * params instead of importing a caller's type.
 */
export type CancellableBooking = {
  status: BookingStatus;
  startDate: string;
  totalPrice: number;
};

export function toCancellableBooking(booking: Booking): CancellableBooking {
  return {
    status: booking.status,
    startDate: booking.start_date,
    totalPrice: Number(booking.total_price),
  };
}

export function isTerminal(status: BookingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function hasStarted(booking: CancellableBooking, now: Date): boolean {
  return new Date(booking.startDate).getTime() <= now.getTime();
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
  if (booking.status === "pending") return booking.totalPrice;

  // The host broke a confirmed commitment: no forfeit window applies to them.
  if (actor === "host") return booking.totalPrice;

  const freeUntil =
    new Date(booking.startDate).getTime() - FREE_CANCELLATION_WINDOW_MS;
  return now.getTime() < freeUntil ? booking.totalPrice : 0;
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
