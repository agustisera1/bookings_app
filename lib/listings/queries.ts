import { ObjectId, type Document, type Filter } from "mongodb";
import { authorize } from "@/lib/auth/session";
import { TERMINAL_STATUSES } from "@/lib/bookings/policy";
import * as bookingsRepo from "@/lib/bookings/repository";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";
import type { Listing } from "./types";
import { listingFiltersSchema, listingIdSchema, type ListingFilters, type ListingFiltersInput } from "./validation";

const DEFAULT_LISTINGS_LIMIT = 12;
const MAX_LISTINGS_LIMIT = 100;

export async function getListing(listingId: string): Promise<ServiceResult<Listing | null>> {
  const auth = await authorize("listings:view");
  if (!auth.ok) return auth;

  // Not an ObjectId: no listing can have it, and `new ObjectId` would throw.
  if (!listingIdSchema.safeParse(listingId).success) return { ok: true, data: null };

  try {
    return { ok: true, data: await repo.findListingById(listingId) };
  } catch (error) {
    console.error("[getListing]", error);
    return { ok: false, error: "Could not retrieve the listing", code: "UNEXPECTED" };
  }
}

export async function getListingsByIds(ids: string[]): Promise<ServiceResult<Listing[]>> {
  const auth = await authorize("listings:view");
  if (!auth.ok) return auth;

  try {
    return { ok: true, data: await repo.findListingsByIds(ids) };
  } catch (error) {
    console.error("[getListingsByIds]", error);
    return { ok: false, error: "Could not retrieve the listings", code: "UNEXPECTED" };
  }
}

function toMongoFilter(filters: ListingFilters, hostId: string | undefined): Filter<Document> {
  return {
    ...(filters.term ? { $text: { $search: filters.term } } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.own ? { host_id: hostId } : {}),
    ...(filters.rating ? { rating_avg: { $gte: filters.rating, $lte: 5 } } : {}),
    ...(filters.priceRange
      ? { price: { $gte: filters.priceRange[0], $lte: filters.priceRange[1] } }
      : {}),
    ...(filters.propertyType ? { "attributes.property_type": filters.propertyType } : {}),
    // Capacity filters are "at least N"; amenities match on any of the selected ($in).
    ...(filters.beds ? { "attributes.beds": { $gte: filters.beds } } : {}),
    ...(filters.bathrooms ? { "attributes.bathrooms": { $gte: filters.bathrooms } } : {}),
    ...(filters.maxGuests ? { "attributes.max_guests": { $gte: filters.maxGuests } } : {}),
    ...(filters.amenities?.length ? { "attributes.amenities": { $in: filters.amenities } } : {}),
  };
}

export async function getListings(input: ListingFiltersInput | null): Promise<ServiceResult<Listing[]>> {
  const auth = await authorize("listings:search");
  if (!auth.ok) return auth;

  const parsed = listingFiltersSchema.safeParse(input ?? {});
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  const filters = parsed.data;
  // Mongo reads a negative limit as abs(limit): clamping keeps the cap from being evaded.
  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LISTINGS_LIMIT, 1), MAX_LISTINGS_LIMIT);
  const mongoFilter = toMongoFilter(filters, auth.data.id);

  try {
    const [from, to] = filters.availabilityRange ?? [];
    if (from && to) {
      const bookedIds = await bookingsRepo.findBookedListingIds(from, to, TERMINAL_STATUSES);
      if (bookedIds.length > 0)
        mongoFilter._id = { $nin: bookedIds.map((id) => new ObjectId(id)) };
    }

    return { ok: true, data: await repo.findListings(mongoFilter, limit) };
  } catch (error) {
    console.error("[getListings]", error);
    return { ok: false, error: "Could not retrieve the listings", code: "UNEXPECTED" };
  }
}
