"use server";
import type { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { pgErrorToCode } from "@/lib/infra/postgres";
import * as listingsRepo from "@/lib/listings/repository";
import type { OutboxEvent } from "@/lib/outbox/types";
import type { ServiceResult } from "@/lib/shared/result";
import { revalidatePaths, type RevalidationTarget } from "@/lib/shared/revalidate";
import { cancelActorOf, canCancel, partyOf, SLOT_HOLDING_STATUSES } from "./policy";
import * as repo from "./repository";
import type { Booking } from "./types";
import {
  cancelBookingSchema,
  createBookingSchema,
  manageBookingSchema,
  type CancelBookingInput,
  type CreateBookingInput,
  type ManageBookingInput,
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

const NOT_FOUND = { ok: false, error: "Booking not found", code: "NOT_FOUND" } as const;

const CHANGED = {
  ok: false,
  error: "This booking changed in the meantime. Reload the page and try again.",
  code: "CONFLICT",
} as const;

// A malformed booking id names no booking: NOT_FOUND, like a missing one.
function parseBookingInput<T>(schema: z.ZodType<T>, input: unknown): ServiceResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const [issue] = parsed.error.issues;
  if (issue.path[0] === "bookingId") return NOT_FOUND;
  return { ok: false, error: issue.message, code: "VALIDATION" };
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<ServiceResult<Pick<Booking, "id" | "created_at">>> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  const { listingId, checkIn, checkOut, guests, totalPrice } = parsed.data;
  const stay = {
    listing_id: listingId,
    guest_id: auth.data.id,
    start_date: checkIn,
    end_date: checkOut,
  };

  try {
    if (!(await listingsRepo.findListingById(listingId)))
      return { ok: false, error: "Listing not found", code: "NOT_FOUND" };

    const booking = await repo.insertBooking(
      { ...stay, total_price: totalPrice, guests },
      { type: "booking.created", payload: { listingId, guestId: auth.data.id } },
    );
    return { ok: true, data: booking };
  } catch (error) {
    // Only the DB can see a concurrent overlapping booking (`no_overlap`).
    if (pgErrorToCode(error) === "CONFLICT") {
      // A retry of a request that already went through overlaps with its own booking.
      const own = await repo.findBookingForStay(stay, SLOT_HOLDING_STATUSES).catch(() => null);
      if (own) return { ok: true, data: own };
      return {
        ok: false,
        error: "These dates are no longer available. Please select different dates.",
        code: "CONFLICT",
      };
    }
    console.error("[createBooking]", error);
    return { ok: false, error: "Could not complete your booking", code: "UNEXPECTED" };
  }
}

// The refund is decided by the policy and written in the same UPDATE as the status.
export async function cancelBooking(
  input: CancelBookingInput,
): Promise<ServiceResult<{ id: string; refundAmount: number }>> {
  // Every account is a guest: this only proves authentication. Ownership gates below.
  const auth = await authorize("bookings:cancel-own");
  if (!auth.ok) return auth;

  const parsed = parseBookingInput(cancelBookingSchema, input);
  if (!parsed.ok) return parsed;
  const { bookingId, reason } = parsed.data;

  try {
    const booking = await repo.findBookingById(bookingId);
    if (!booking) return NOT_FOUND;

    const listing = await listingsRepo.findListingById(booking.listing_id);
    const actor = cancelActorOf(
      partyOf(booking, auth.data.id, listing?.host_id),
      auth.data.permissions.includes("bookings:manage"),
    );
    if (!actor)
      return { ok: false, error: "You can only cancel your own bookings", code: "FORBIDDEN" };

    const now = new Date();
    const check = canCancel(booking, actor, now);
    if (!check.allowed) return { ok: false, error: check.reason, code: "CONFLICT" };

    const cancelled = await repo.updateBooking(
      booking.id,
      booking.status,
      {
        status: "cancelled",
        cancelled_by: actor,
        cancelled_at: now,
        refund_amount: check.refundAmount,
        ...withReason(reason),
      },
      bookingEvent("booking.cancelled", booking),
    );
    if (!cancelled) return CHANGED;

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
  if (!booking) return NOT_FOUND;

  const listing = await listingsRepo.findListingById(booking.listing_id);
  if (listing?.host_id !== userId)
    return {
      ok: false,
      error: "You can only manage bookings on your own listings",
      code: "FORBIDDEN",
    };

  return { ok: true, data: booking };
}

export async function acceptBooking(input: ManageBookingInput): Promise<ServiceResult<null>> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;

  const parsed = parseBookingInput(manageBookingSchema, input);
  if (!parsed.ok) return parsed;
  const { bookingId, hostMessage } = parsed.data;

  try {
    const hosted = await loadHostedBooking(bookingId, auth.data.id);
    if (!hosted.ok) return hosted;

    const booking = hosted.data;
    if (booking.status !== "pending")
      return { ok: false, error: `This booking is already ${booking.status}`, code: "CONFLICT" };

    const accepted = await repo.updateBooking(
      booking.id,
      "pending",
      { status: "accepted", ...withReason(hostMessage) },
      bookingEvent("booking.accepted", booking),
    );
    if (!accepted) return CHANGED;

    revalidatePaths(HOST_VIEWS);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[acceptBooking]", error);
    return { ok: false, error: "Could not accept the booking", code: "UNEXPECTED" };
  }
}

export async function rejectBooking(input: ManageBookingInput): Promise<ServiceResult<null>> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;

  const parsed = parseBookingInput(manageBookingSchema, input);
  if (!parsed.ok) return parsed;
  const { bookingId, hostMessage } = parsed.data;

  try {
    const hosted = await loadHostedBooking(bookingId, auth.data.id);
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
        code: "CONFLICT",
      };

    const rejected = await repo.updateBooking(
      booking.id,
      "pending",
      { status: "rejected", ...withReason(hostMessage) },
      bookingEvent("booking.rejected", booking),
    );
    if (!rejected) return CHANGED;

    revalidatePaths(HOST_VIEWS);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[rejectBooking]", error);
    return { ok: false, error: "Could not reject the booking", code: "UNEXPECTED" };
  }
}
