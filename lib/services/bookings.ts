"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import type { Booking } from "../types/booking";
import * as db from "../postgres";
import * as bookingsRepo from "../repositories/bookings.pg";
import { revalidatePath } from "next/cache";

export type { Booking, GuestBooking } from "../types/booking";

export async function getUserBookings(): Promise<ServiceResult<Booking[]>> {
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

export async function cancelBooking(id: string): Promise<ServiceResult> {
  const auth = await authorize("bookings:cancel-own");
  if (!auth.ok) return auth;

  try {
    const deleted = await bookingsRepo.cancelBooking(id, auth.data.id);

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
    console.error("[cancelBooking]", error);
    return { ok: false, error: "Could not cancel the booking", code };
  }
}
