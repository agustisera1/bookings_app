"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";

export async function createBooking(
  from: string,
  to: string,
): Promise<ServiceResult> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  // 1. Retrieve booking and user data
  const listing_id = 1;
  const guest_id = 1;
  const start_date = from;
  const end_date = from;
  const total_price = "";

  // 2. Aquire lock

  // 3. Write on DB

  // 4. Return booking data

  return { ok: true, data: null };
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
