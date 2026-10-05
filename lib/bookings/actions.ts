"use server";
import { authorize } from "@/lib/auth/session";
import { pgErrorToCode } from "@/lib/infra/postgres";
import * as listingsRepo from "@/lib/listings/repository";
import type { OutboxEvent } from "@/lib/outbox/types";
import type { ServiceResult } from "@/lib/shared/result";
import { revalidatePaths, type RevalidationTarget } from "@/lib/shared/revalidate";
import { cancelActorOf, canCancel, partyOf } from "./policy";
import * as repo from "./repository";
import type { Booking } from "./types";
import {
  bookingIdSchema,
  createBookingSchema,
  statusReasonSchema,
  type CreateBookingInput,
} from "./validation";

const HOST_VIEWS: RevalidationTarget[] = [
  { path: "/listings/[id]", level: "page" },
  { path: "/listings/mine" },
];

const BOOKING_VIEWS: RevalidationTarget[] = [
  ...HOST_VIEWS,
  { path: "/bookings" },
  { path: "/bookings/[id]", level: "page" },
];

const bookingEvent = (type: OutboxEvent["type"], booking: Booking): OutboxEvent => ({
  type,
  payload: { listingId: booking.listing_id, guestId: booking.guest_id },
});

const withReason = (reason: string | undefined) => (reason ? { status_reason: reason } : {});

export async function createBooking(
  input: CreateBookingInput,
): Promise<ServiceResult<Pick<Booking, "id" | "created_at">>> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  const { listingId, checkIn, checkOut, guests, totalPrice } = parsed.data;

  try {
    const booking = await repo.insertBooking(
      {
        listing_id: listingId,
        guest_id: auth.data.id,
        start_date: checkIn,
        end_date: checkOut,
        total_price: totalPrice,
        guests,
      },
      { type: "booking.created", payload: { listingId, guestId: auth.data.id } },
    );
    return { ok: true, data: booking };
  } catch (error) {
    // Only the DB can see a concurrent overlapping booking (`no_overlap`).
    if (pgErrorToCode(error) === "CONFLICT")
      return {
        ok: false,
        error: "These dates are no longer available. Please select different dates.",
        code: "CONFLICT",
      };
    console.error("[createBooking]", error);
    return { ok: false, error: "Could not complete your booking", code: "UNEXPECTED" };
  }
}

// The refund is decided by the policy and written in the same UPDATE as the status.
export async function cancelBooking(
  bookingId: string,
  reason?: string,
): Promise<ServiceResult<{ id: string; refundAmount: number }>> {
  // Every account is a guest: this only proves authentication. Ownership gates below.
  const auth = await authorize("bookings:cancel-own");
  if (!auth.ok) return auth;

  const id = bookingIdSchema.safeParse(bookingId);
  const note = statusReasonSchema.safeParse(reason);
  if (!id.success) return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
  if (!note.success) return { ok: false, error: note.error.issues[0].message, code: "VALIDATION" };

  try {
    const booking = await repo.findBookingById(id.data);
    if (!booking) return { ok: false, error: "Booking not found", code: "NOT_FOUND" };

    const listing = await listingsRepo.findListingById(booking.listing_id);
    const actor = cancelActorOf(
      partyOf(booking, auth.data.id, listing?.host_id),
      auth.data.permissions.includes("bookings:manage"),
    );
    if (!actor)
      return { ok: false, error: "You can only cancel your own bookings", code: "FORBIDDEN" };

    const now = new Date();
    const check = canCancel(booking, actor, now);
    if (!check.allowed) return { ok: false, error: check.reason, code: "VALIDATION" };

    const cancelled = await repo.updateBooking(
      booking.id,
      {
        status: "cancelled",
        cancelled_by: actor,
        cancelled_at: now,
        refund_amount: check.refundAmount,
        ...withReason(note.data),
      },
      bookingEvent("booking.cancelled", booking),
    );
    if (!cancelled)
      return { ok: false, error: "Booking not found or already cancelled", code: "NOT_FOUND" };

    revalidatePaths(BOOKING_VIEWS);
    return { ok: true, data: { id: booking.id, refundAmount: check.refundAmount } };
  } catch (error) {
    console.error("[cancelBooking]", error);
    return { ok: false, error: "Could not cancel the booking", code: "UNEXPECTED" };
  }
}

// `bookings:manage` only proves the caller is *a* host; this proves it's this listing's.
async function loadHostedBooking(
  bookingId: string,
  userId: string,
): Promise<ServiceResult<Booking>> {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) return { ok: false, error: "Booking not found", code: "NOT_FOUND" };

  const listing = await listingsRepo.findListingById(booking.listing_id);
  if (listing?.host_id !== userId)
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
): Promise<ServiceResult<null>> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;

  const id = bookingIdSchema.safeParse(bookingId);
  const note = statusReasonSchema.safeParse(hostMessage);
  if (!id.success) return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
  if (!note.success) return { ok: false, error: note.error.issues[0].message, code: "VALIDATION" };

  try {
    const hosted = await loadHostedBooking(id.data, auth.data.id);
    if (!hosted.ok) return hosted;

    const booking = hosted.data;
    if (booking.status !== "pending")
      return { ok: false, error: `This booking is already ${booking.status}`, code: "VALIDATION" };

    const accepted = await repo.updateBooking(
      booking.id,
      { status: "accepted", ...withReason(note.data) },
      bookingEvent("booking.accepted", booking),
    );
    if (!accepted)
      return { ok: false, error: "Booking not found or already accepted", code: "NOT_FOUND" };

    revalidatePaths(HOST_VIEWS);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[acceptBooking]", error);
    return { ok: false, error: "Could not accept the booking", code: "UNEXPECTED" };
  }
}

export async function rejectBooking(
  bookingId: string,
  hostMessage?: string,
): Promise<ServiceResult<null>> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;

  const id = bookingIdSchema.safeParse(bookingId);
  const note = statusReasonSchema.safeParse(hostMessage);
  if (!id.success) return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
  if (!note.success) return { ok: false, error: note.error.issues[0].message, code: "VALIDATION" };

  try {
    const hosted = await loadHostedBooking(id.data, auth.data.id);
    if (!hosted.ok) return hosted;

    // A confirmed stay is cancelled (which refunds the guest), not rejected.
    const booking = hosted.data;
    if (booking.status !== "pending")
      return {
        ok: false,
        error:
          booking.status === "accepted"
            ? "This booking was already accepted. Cancel it instead: the guest will be refunded in full."
            : `This booking is already ${booking.status}`,
        code: "VALIDATION",
      };

    const rejected = await repo.updateBooking(
      booking.id,
      { status: "rejected", ...withReason(note.data) },
      bookingEvent("booking.rejected", booking),
    );
    if (!rejected)
      return { ok: false, error: "Booking not found or already rejected", code: "NOT_FOUND" };

    revalidatePaths(HOST_VIEWS);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[rejectBooking]", error);
    return { ok: false, error: "Could not reject the booking", code: "UNEXPECTED" };
  }
}
