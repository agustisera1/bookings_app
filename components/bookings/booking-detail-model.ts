import {
  canCancel,
  freeCancellationDeadline,
  type CancellationCheck,
} from "@/lib/bookings/policy";
import { calcNights, parseTs } from "@/lib/dates";
import type { BookingStatus } from "@/lib/types/booking";
import { toCancellableRow, type BookingRow } from "./bookings-model";

/** Where the stay sits relative to `now`, independent of who confirmed it. */
export type StayStage = "upcoming" | "in_progress" | "past";

export function stayStage(booking: BookingRow, now: number): StayStage {
  const start = parseTs(booking.start_date)?.getTime();
  const end = parseTs(booking.end_date)?.getTime();
  if (start == null || end == null) return "upcoming";
  if (now < start) return "upcoming";
  // Inclusive upper bound: `end_date`'s night still counts as booked, the same
  // reading `getAvailabilityFromBookings` gives the range.
  return now <= end ? "in_progress" : "past";
}

export type PriceBreakdown = {
  nights: number;
  /** `null` for a degenerate range, so the UI drops the per-night line instead of dividing by zero. */
  nightlyRate: number | null;
  total: number;
};

export function priceBreakdown(booking: BookingRow): PriceBreakdown {
  const nights = calcNights(booking.start_date, booking.end_date);
  const total = booking.total_price ?? 0;
  return { nights, nightlyRate: nights > 0 ? total / nights : null, total };
}

export type StatusSummary = { headline: string; detail: string };

// A status never moves on its own: a request the host ignored stays `pending`
// forever. The stage is what separates "waiting" from "never answered".
export function describeStatus(
  status: BookingStatus,
  stage: StayStage,
): StatusSummary {
  switch (status) {
    case "pending":
      return stage === "past"
        ? {
            headline: "Never confirmed",
            detail:
              "The host didn't answer this request before the check-in date.",
          }
        : {
            headline: "Waiting on the host",
            detail:
              "The host still has to accept this request. Your dates are held in the meantime, so nobody else can book them.",
          };
    case "accepted":
      if (stage === "upcoming")
        return {
          headline: "Confirmed",
          detail: "The host accepted your request. You're set for check-in.",
        };
      return stage === "in_progress"
        ? {
            headline: "Stay in progress",
            detail: "You're in the middle of this stay right now.",
          }
        : {
            headline: "Completed",
            detail:
              "This stay is over. You can leave a review from the listing page.",
          };
    case "rejected":
      return {
        headline: "Declined by the host",
        detail:
          "The host couldn't take these dates. Nothing was charged for this request.",
      };
    case "cancelled":
      return {
        headline: "Cancelled",
        detail: "This reservation was cancelled and the dates were released.",
      };
  }
}

/** This page is the guest's view of their own booking, so the actor is fixed. */
export function guestCancellation(
  booking: BookingRow,
  now: Date,
): CancellationCheck {
  return canCancel(toCancellableRow(booking), "guest", now);
}

export function refundDeadline(booking: BookingRow): Date {
  return freeCancellationDeadline(toCancellableRow(booking));
}
