"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";
import * as bookingsRepo from "../repositories/bookings.pg";
import * as listingsRepo from "../repositories/listings.mongo";
import * as usersRepo from "../repositories/users.pg";
import { revalidatePath } from "next/cache";
import type { CurrentUser } from "../types/user";
import type { Booking, CancelActor } from "../types/booking";
import { canCancel, toCancellableBooking } from "../bookings/policy";

export type {
  Booking,
  BookingParty,
  BookingStatus,
  CancelActor,
  GuestBooking,
} from "../types/booking";

export async function getUserBookings(): Promise<
  ServiceResult<Awaited<ReturnType<typeof bookingsRepo.findBookingsByGuestId>>>
> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    const {
      data: { id: userId },
    } = auth;

    const bookings = await bookingsRepo.findBookingsByGuestId(userId);
    return { ok: true, data: bookings };
  } catch (error) {
    console.error("[getUserBookings]", error);
    return {
      ok: false,
      error: "Could not retrieve your bookings",
      code: "UNEXPECTED",
    };
  }
}

type CreateBookingParams = {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  listingId: string;
  totalPrice: number;
};

export async function createBooking(
  params: CreateBookingParams,
): Promise<ServiceResult> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  try {
    // 1. Acquire lock (Phase 3 — Redis)

    // 2. Write on DB
    const booking = await bookingsRepo.createBookingRecord(
      {
        listingId: params.listingId,
        guestId: auth.data.id,
        checkIn: params.checkIn.toISOString(),
        checkOut: params.checkOut.toISOString(),
        totalPrice: params.totalPrice,
        guests: params.guests,
      },
      {
        type: "booking.created",
        payload: { listingId: params.listingId, guestId: auth.data.id },
      },
    );

    if (!booking)
      return {
        ok: false,
        error: "Could not create the booking",
        code: "UNEXPECTED",
      };

    return { ok: true, data: booking };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    if (code === "CONFLICT")
      return {
        ok: false,
        error:
          "These dates are no longer available. Please select different dates.",
        code,
      };
    console.error("[createBooking]", error);
    return { ok: false, error: "Could not complete your booking", code };
  }
}

/**
 * An account can be both guest and host (RF-02), so what someone may do to a
 * booking follows from their relationship to *this* booking, not their roles.
 * Returns null when they have no standing to cancel it at all.
 */
async function resolveCancelActor(
  booking: Booking,
  user: CurrentUser,
): Promise<CancelActor | null> {
  if (booking.guest_id === user.id) return "guest";
  if (!user.permissions.includes("bookings:manage")) return null;

  const listing = await listingsRepo.findListingById(booking.listing_id);
  return listing?.host_id === user.id ? "host" : null;
}

/**
 * Cancels a booking on behalf of whoever owns it — the guest who booked it or
 * the host of the listing. The refund is decided by the policy and written in
 * the same UPDATE as the status, so a cancellation can't land without one.
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string,
): Promise<ServiceResult<{ id: string; refundAmount: number }>> {
  // Baseline permission — every account is a guest (RF-02), so this only proves
  // the caller is authenticated. Ownership below is what actually gates this.
  const auth = await authorize("bookings:cancel-own");
  if (!auth.ok) return auth;

  try {
    const booking = await bookingsRepo.getBookingById(bookingId);
    if (!booking)
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };

    const actor = await resolveCancelActor(booking, auth.data);
    if (!actor)
      return {
        ok: false,
        error: "You can only cancel your own bookings",
        code: "FORBIDDEN",
      };

    const now = new Date();
    const check = canCancel(toCancellableBooking(booking), actor, now);
    if (!check.allowed)
      return { ok: false, error: check.reason, code: "VALIDATION" };

    const updates = {
      status: "cancelled",
      cancelled_by: actor,
      cancelled_at: now.toISOString(),
      // The policy computes money as number; the column is NUMERIC(10,2), which
      // pg expects (and returns) as string. `toFixed(2)` matches its scale.
      refund_amount: check.refundAmount.toFixed(2),
      ...(reason ? { status_reason: reason.trim() } : {}),
    } satisfies Partial<Booking>;

    const cancelled = await bookingsRepo.updateBooking(bookingId, updates, {
      type: "booking.cancelled",
      payload: { listingId: booking.listing_id, guestId: booking.guest_id },
    });

    if (!cancelled)
      return {
        ok: false,
        error: "Booking not found or already cancelled",
        code: "NOT_FOUND",
      };

    revalidatePath("/bookings");
    revalidatePath("/bookings/[id]", "page");
    revalidatePath("/listings/[id]", "page");
    revalidatePath("/listings/mine");
    return {
      ok: true,
      data: { id: bookingId, refundAmount: check.refundAmount },
    };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    console.error("[cancelBooking]", error);
    return { ok: false, error: "Could not cancel the booking", code };
  }
}

/**
 * Loads a booking and proves the caller hosts the listing it targets.
 * `authorize("bookings:manage")` only proves the caller is *a* host, and
 * `updateBooking` filters by id alone — without this, any host could answer
 * another host's requests.
 */
async function authorizeHostForBooking(
  bookingId: string,
  user: CurrentUser,
): Promise<ServiceResult<Booking>> {
  const booking = await bookingsRepo.getBookingById(bookingId);
  if (!booking)
    return { ok: false, error: "Booking not found", code: "NOT_FOUND" };

  const listing = await listingsRepo.findListingById(booking.listing_id);
  if (!listing || listing.host_id !== user.id)
    return {
      ok: false,
      error: "You can only manage bookings on your own listings",
      code: "FORBIDDEN",
    };

  return { ok: true, data: booking };
}

export async function acceptBooking(
  bookingId: string,
  hostMessage?: string,
): Promise<ServiceResult> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;
  try {
    const hostCheck = await authorizeHostForBooking(bookingId, auth.data);
    if (!hostCheck.ok) return hostCheck;

    const booking = hostCheck.data;
    if (booking.status !== "pending")
      return {
        ok: false,
        error: `This booking is already ${booking.status}`,
        code: "VALIDATION",
      };

    const accepted = await bookingsRepo.updateBooking(
      bookingId,
      {
        status: "accepted",
        ...(hostMessage ? { status_reason: hostMessage.trim() } : {}),
      },
      {
        type: "booking.accepted",
        payload: { listingId: booking.listing_id, guestId: booking.guest_id },
      },
    );

    if (!accepted) {
      return {
        ok: false,
        error:
          "Could not accept the booking. Booking not found or already accepted",
        code: "NOT_FOUND",
      };
    }

    revalidatePath("/listings/[id]", "page");
    revalidatePath("/listings/mine");
    return {
      ok: true,
      data: accepted,
    };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    console.error("[acceptBooking]:", error);
    return {
      error: "Could not accept the booking",
      code,
      ok: false,
    };
  }
}

export async function rejectBooking(
  bookingId: string,
  hostMessage?: string,
): Promise<ServiceResult> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;
  try {
    const hostCheck = await authorizeHostForBooking(bookingId, auth.data);
    if (!hostCheck.ok) return hostCheck;

    // Rejecting is the answer to an open request. A stay already confirmed has
    // to be cancelled instead, which refunds the guest.
    const booking = hostCheck.data;
    if (booking.status !== "pending")
      return {
        ok: false,
        error:
          booking.status === "accepted"
            ? "This booking was already accepted. Cancel it instead — the guest will be refunded in full."
            : `This booking is already ${booking.status}`,
        code: "VALIDATION",
      };

    const rejected = await bookingsRepo.updateBooking(
      bookingId,
      {
        status: "rejected",
        ...(hostMessage ? { status_reason: hostMessage.trim() } : {}),
      },
      {
        type: "booking.rejected",
        payload: { listingId: booking.listing_id, guestId: booking.guest_id },
      },
    );

    if (!rejected) {
      return {
        ok: false,
        error: "Booking not found or already rejected",
        code: "NOT_FOUND",
      };
    }

    revalidatePath("/listings/[id]", "page");
    revalidatePath("/listings/mine");
    return {
      ok: true,
      data: rejected,
    };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    console.error("[rejectBooking]:", error);
    return {
      error: "Could not reject the booking",
      code,
      ok: false,
    };
  }
}

