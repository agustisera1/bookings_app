"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";

export async function createBooking(): Promise<ServiceResult> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;
  console.log("[createBooking]: invocado");
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
