"use server";
import { BookingFormValues } from "@/components/bookings/booking-form";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";

//** Object type representing the zipped data between the booking and listing */
export type GuestBooking = {
  type: string;
  title: string;
  created_at: string; // Reservation date
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  id: string;
  guests: number;
};

export type Booking = {
  start_date: string;
  end_date: string;
  status: string;
  total_price: string;
  created_at: string;
  id: string;
  listing_id: string;
  guest_id: string;
  guests: number;
};

export async function getUserBookings(): Promise<ServiceResult<Booking[]>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;
  try {
    // 1. Get all bookings made from the user
    const {
      data: { id: userId },
    } = auth;

    const result = await db.query(
      `
      SELECT *
      FROM bookings 
      WHERE $1 = guest_id
      `,
      [userId],
    );

    const noBookings = result.rowCount === null || result.rowCount === 0;
    if (noBookings)
      return {
        ok: false,
        error: "The user has no bookings",
        code: "VALIDATION",
      };

    const bookings = result.rows.map((row) => row as Booking);
    return {
      ok: true,
      data: bookings,
    };
  } catch (error) {
    console.error("[getUserBookings]", error);
    return {
      ok: false,
      error: "Could not retrieve your bookings",
      code: "UNEXPECTED",
    };
  }
}

export async function createBooking(
  params: BookingFormValues & { listingId: string; totalPrice: number },
): Promise<ServiceResult> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  try {
    // 1. Acquire lock (Phase 3 — Redis)

    // 2. Write on DB
    const result = await db.query(
      ` INSERT INTO bookings (listing_id, guest_id, start_date, end_date, total_price, guests)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id, created_at`,
      [
        params.listingId,
        auth.data.id,
        params.checkIn.toISOString(),
        params.checkOut.toISOString(),
        params.totalPrice,
        params.guests,
      ],
    );

    if (!result.rowCount || result.rowCount === 0)
      return {
        ok: false,
        error: "Could not create the booking",
        code: "UNEXPECTED",
      };

    return { ok: true, data: result.rows[0] };
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

export async function cancelBooking(): Promise<ServiceResult> {
  const auth = await authorize("bookings:cancel-own");
  if (!auth.ok) return auth;
  console.log("[cancelBooking]: invocado");
  return { ok: true, data: null };
}
