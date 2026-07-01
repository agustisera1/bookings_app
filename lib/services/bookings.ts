"use server";
import { BookingFormValues } from "@/components/bookings/booking-form";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";

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
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not create the booking",
      code: db.pgErrorToCode(error),
    };
  }
}

export async function cancelBooking(): Promise<ServiceResult> {
  const auth = await authorize("bookings:cancel-own");
  if (!auth.ok) return auth;
  console.log("[cancelBooking]: invocado");
  return { ok: true, data: null };
}

export async function getBookingsForListing(): Promise<ServiceResult> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;
  console.log("[getBookingsForListing]: invocado");
  return { ok: true, data: null };
}
