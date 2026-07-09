"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";
import * as bookingsRepo from "../repositories/bookings.pg";
import { revalidatePath } from "next/cache";

export type { Booking, GuestBooking } from "../types/booking";

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

export async function createBooking(params: {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  listingId: string;
  totalPrice: number;
}): Promise<ServiceResult> {
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

export async function deleteBooking(id: string): Promise<ServiceResult> {
  const auth = await authorize("bookings:cancel-own");
  if (!auth.ok) return auth;

  try {
    const canDelete = verifyDeletionPolicy(id);
    if (!canDelete) {
      return {
        ok: false,
        error: "Booking cannot be deleted under its conditions",
        code: "VALIDATION",
      };
    }

    const deleted = await bookingsRepo.deleteBooking(id, auth.data.id);

    if (!deleted)
      return {
        ok: false,
        error: "Booking not found or already cancelled",
        code: "NOT_FOUND",
      };

    revalidatePath("/bookings");
    revalidatePath("/bookings/[id]", "page");
    return {
      ok: true,
      data: deleted,
    };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    console.error("[deleteBooking]", error);
    return { ok: false, error: "Could not cancel the booking", code };
  }
}

export async function acceptBooking(
  bookingId: string,
  hostMessage?: string,
): Promise<ServiceResult> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;
  try {
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

async function verifyRejectionPolicy(bookingId: string) {
  console.info("[verifyRejectionPolicy]:", bookingId);
  // 1. Get the booking
  // 2. Check the booking data and verify
  return Promise.resolve(true);
}

async function verifyDeletionPolicy(bookingId: string) {
  console.info("[verifyDeletionPolicy]:", bookingId);
  // 1. Get the booking and its data
  // 2. Check that the current booking is already cancelled before delete.
  // 3. Check money conditions before delete
  return Promise.resolve(true);
}

export async function rejectBooking(
  bookingId: string,
  hostMessage?: string,
): Promise<ServiceResult> {
  const auth = await authorize("bookings:manage");
  if (!auth.ok) return auth;
  try {
    const policyCheck = await verifyRejectionPolicy(bookingId);
    if (!policyCheck) {
      return {
        ok: false,
        error: "Booking cannot be rejected under its conditions",
        code: "VALIDATION",
      };
    }

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
