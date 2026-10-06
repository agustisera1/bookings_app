import { authorize } from "@/lib/auth/session";
import * as listingsRepo from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import type { ServiceResult } from "@/lib/shared/result";
import { MAX_BOOKINGS_PER_LIST, SLOT_HOLDING_STATUSES, partyOf } from "./policy";
import * as repo from "./repository";
import type { BookedRange, Booking, BookingParty } from "./types";
import { bookingIdSchema } from "./validation";

export async function getUserBookings(): Promise<
  ServiceResult<(Booking & { listing: Listing })[]>
> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    const bookings = await repo.findBookingsByGuestId(auth.data.id, MAX_BOOKINGS_PER_LIST);
    const listings = await listingsRepo.findListingsByIds(
      bookings.map(({ listing_id }) => listing_id),
    );
    const byId = new Map(listings.map((listing) => [listing._id, listing]));

    return {
      ok: true,
      data: bookings.flatMap((booking) => {
        const listing = byId.get(booking.listing_id);
        if (listing) return [{ ...booking, listing }];
        console.error(`[getUserBookings] booking ${booking.id} points at a missing listing`);
        return [];
      }),
    };
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

export async function getListingsBookings(
  listingIds: string[],
): Promise<ServiceResult<Booking[]>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    return {
      ok: true,
      data: await repo.findBookingsByListingIds(listingIds, MAX_BOOKINGS_PER_LIST),
    };
  } catch (error) {
    console.error("[getListingsBookings]", error);
    return { ok: false, error: "Could not retrieve the bookings", code: "UNEXPECTED" };
  }
}

export async function getListingsAvailability(
  listingIds: string[],
): Promise<ServiceResult<(BookedRange & Pick<Booking, "listing_id">)[]>> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  try {
    return {
      ok: true,
      data: await repo.findBookedRangesByListingIds(listingIds, SLOT_HOLDING_STATUSES),
    };
  } catch (error) {
    console.error("[getListingsAvailability]", error);
    return {
      ok: false,
      error: "Could not retrieve the listing availability",
      code: "UNEXPECTED",
    };
  }
}
