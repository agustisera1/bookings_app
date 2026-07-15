"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";
import * as bookingsRepo from "../repositories/bookings.pg";
import * as listingsRepo from "../repositories/listings.mongo";
import * as usersRepo from "../repositories/users.pg";
import { revalidatePath } from "next/cache";
import {
  emailQueue,
  pgBookingToEmailBooking,
  toBookingEmailPayload,
  type NotificationType,
} from "../events";
import type { CurrentUser, User } from "../types/user";
import type { ListingDocumentValues } from "../types/listing";
import type { Booking, BookingParty, CancelActor } from "../types/booking";
import { canCancel, toCancellableBooking } from "../bookings/policy";
import { Job } from "bullmq";
import { queueNotification } from "./notifications";

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
    const booking = await bookingsRepo.createBookingRecord({
      listingId: params.listingId,
      guestId: auth.data.id,
      checkIn: params.checkIn.toISOString(),
      checkOut: params.checkOut.toISOString(),
      totalPrice: params.totalPrice,
      guests: params.guests,
    });

    // 3. Queue notification and email events

    if (!booking)
      return {
        ok: false,
        error: "Could not create the booking",
        code: "UNEXPECTED",
      };

    const listing = await listingsRepo.findListingById(params.listingId);
    const host = listing ? await usersRepo.findUserById(listing.host_id) : null;

    // In-app: let the host know a new booking landed on their listing. Async and
    // best-effort (RNF-04) — a queue hiccup must never fail the persisted booking.
    if (host) {
      await queueNotification({
        type: "notify_user",
        listingId: params.listingId,
        bookingId: booking.id,
        userId: host.id,
      }).catch((err) =>
        console.error("[createBooking]: could not queue host notification", err),
      );
    }

    await emailBookingDetails({
      type: "pending",
      guestEmail: auth.data.email,
      booking: {
        id: booking.id,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        totalPrice: params.totalPrice,
      },
      host,
      listing,
    });

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

    const cancelled = await bookingsRepo.updateBooking(bookingId, {
      status: "cancelled",
      cancelled_by: actor,
      cancelled_at: now.toISOString(),
      refund_amount: check.refundAmount,
      ...(reason ? { status_reason: reason.trim() } : {}),
    });

    if (!cancelled)
      return {
        ok: false,
        error: "Booking not found or already cancelled",
        code: "NOT_FOUND",
      };

    // The counterparty is the one who needs to hear about it — the actor just
    // did it. Safe to reuse the pre-update row: the notification reads the
    // guest, listing and dates, none of which a cancellation touches.
    await notifyBookingStatusChange(
      booking,
      "updated",
      actor === "guest" ? "host" : "guest",
    );

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

    const accepted = await bookingsRepo.updateBooking(bookingId, {
      status: "accepted",
      ...(hostMessage ? { status_reason: hostMessage.trim() } : {}),
    });

    if (!accepted) {
      return {
        ok: false,
        error:
          "Could not accept the booking. Booking not found or already accepted",
        code: "NOT_FOUND",
      };
    }

    await notifyBookingStatusChange(booking, "approved");

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

    const rejected = await bookingsRepo.updateBooking(bookingId, {
      status: "rejected",
      ...(hostMessage ? { status_reason: hostMessage.trim() } : {}),
    });

    if (!rejected) {
      return {
        ok: false,
        error: "Booking not found or already rejected",
        code: "NOT_FOUND",
      };
    }

    await notifyBookingStatusChange(booking, "rejected");

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

// Mirrors the mapper's input (so `booking` accepts either `Date` from the
// create path or ISO strings from a persisted row) but lets host/listing be
// null: emailBookingDetails guards on that before enqueueing.
type EmailBookingParams = Omit<
  Parameters<typeof toBookingEmailPayload>[0],
  "host" | "listing"
> & {
  host: User | null;
  listing: ListingDocumentValues | null;
};

// Single enqueue point for every booking email. Building the payload and the
// `queue.add` live together so the try/catch that turns an ACK failure into a
// ServiceResult is written once, not per notification type.
async function emailBookingDetails(
  bookingDetails: EmailBookingParams,
): Promise<ServiceResult<Job>> {
  const { type, guestEmail, booking, host, listing } = bookingDetails;

  // The email needs a host name and listing details; without them there is
  // nothing worth rendering, so skip the dispatch instead of enqueueing a
  // broken job.
  if (!host || !listing) {
    console.error("[emailBookingDetails]: missing host or listing", booking.id);
    return {
      ok: false,
      error: "Could not dispatch email notification",
      code: "NOT_FOUND",
    };
  }

  try {
    const job = await emailQueue.add(
      "emails",
      toBookingEmailPayload({ type, guestEmail, booking, host, listing }),
    );
    return {
      ok: true,
      data: job,
    };
  } catch (error) {
    console.error("[emailBookingDetails]:", error);
    return {
      ok: false,
      error: "ACK Failed when dispatching email notification",
      code: "UNEXPECTED",
    };
  }
}

// Status-change path (approved / rejected / updated): starts from a persisted
// booking row and rehydrates the guest, listing and host the email needs before
// delegating to the single enqueue point above. Fire-and-forget relative to the
// mutation's happy path, so it never throws — it logs and returns.
//
// `recipient` is who the in-app notification is for: always the counterparty of
// whoever acted, since the actor already knows what they did. The email still
// goes to the guest regardless — `BookingEmailPayload` is guest-addressed, so
// mailing the host needs a change to the contract the worker mirrors.
async function notifyBookingStatusChange(
  booking: Booking,
  type: NotificationType,
  recipient: BookingParty = "guest",
): Promise<void> {
  const [guest, listing] = await Promise.all([
    usersRepo.findUserById(booking.guest_id),
    listingsRepo.findListingById(booking.listing_id),
  ]);
  const host = listing ? await usersRepo.findUserById(listing.host_id) : null;

  if (!guest) {
    console.error("[notifyBookingStatusChange]: missing guest", booking.id);
    return;
  }

  if (!listing) {
    console.error("[notifyBookingStatusChange]: missing listing");
    return;
  }

  const notifyUserId = recipient === "host" ? host?.id : guest.id;

  if (!notifyUserId) {
    console.error(
      "[notifyBookingStatusChange]: missing recipient",
      recipient,
      booking.id,
    );
  } else {
    // Best-effort (RNF-04): honour this function's "never throws" contract so a
    // queue hiccup can't bubble up and fail the mutation that triggered it.
    await queueNotification({
      type: "notify_booking_update",
      listingId: listing._id,
      bookingId: booking.id,
      userId: notifyUserId,
    }).catch((err) =>
      console.error("[notifyBookingStatusChange]: could not queue notification", err),
    );
  }

  await emailBookingDetails({
    type,
    guestEmail: guest.email,
    booking: pgBookingToEmailBooking(booking),
    host,
    listing,
  });
}
