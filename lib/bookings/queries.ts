import { authorize } from "@/lib/auth/session";
import * as listingsRepo from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import type { ServiceResult } from "@/lib/shared/result";
import { SLOT_HOLDING_STATUSES, partyOf } from "./policy";
import * as repo from "./repository";
import type { BookedRange, Booking, BookingParty } from "./types";
import { bookingIdSchema } from "./validation";

export async function getUserBookings(): Promise<ServiceResult<Booking[]>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    return { ok: true, data: await repo.findBookingsByGuestId(auth.data.id) };
  } catch (error) {
    console.error("[getUserBookings]", error);
    return { ok: false, error: "Could not retrieve your bookings", code: "UNEXPECTED" };
  }
}

// A booking the caller has no standing on reads as NOT_FOUND: never confirms it exists.
export async function getBooking(
  bookingId: string,
): Promise<ServiceResult<{ booking: Booking; party: BookingParty; listing: Listing | null }>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  const notFound = { ok: false, error: "Booking not found", code: "NOT_FOUND" } as const;
  if (!bookingIdSchema.safeParse(bookingId).success) return notFound;

  try {
    const booking = await repo.findBookingById(bookingId);
    if (!booking) return notFound;

    const listing = await listingsRepo.findListingById(booking.listing_id);
    const party = partyOf(booking, auth.data.id, listing?.host_id);
    if (!party) return notFound;

    return { ok: true, data: { booking, party, listing } };
  } catch (error) {
    console.error("[getBooking]", error);
    return { ok: false, error: "Could not retrieve the booking", code: "UNEXPECTED" };
  }
}

export async function getListingBookings(listingId: string): Promise<ServiceResult<Booking[]>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    return { ok: true, data: await repo.findBookingsByListingId(listingId) };
  } catch (error) {
    console.error("[getListingBookings]", error);
    return { ok: false, error: "Could not retrieve the bookings", code: "UNEXPECTED" };
  }
}

export async function getListingAvailability(
  listingId: string,
): Promise<ServiceResult<BookedRange[]>> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  try {
    return { ok: true, data: await repo.findBookedRanges(listingId, SLOT_HOLDING_STATUSES) };
  } catch (error) {
    console.error("[getListingAvailability]", error);
    return {
      ok: false,
      error: "Could not retrieve the listing availability",
      code: "UNEXPECTED",
    };
  }
}
