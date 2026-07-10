"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as listingsRepo from "../repositories/listings.mongo";
import * as bookingsRepo from "../repositories/bookings.pg";
import { deleteListingObject } from "../s3";
import type {
  CreateListingInput,
  EditListingDocumentValues,
  GetListingFilters,
  ListingDocumentValues,
} from "../types/listing";
import { DeleteResult, Document, Filter, ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { Booking } from "./bookings";
import { Matcher } from "react-day-picker";
import { getAvailabilityFromBookings } from "../dates";
import {
  FiltersInput,
  InputMaybe,
} from "../apollo/__generated__/resolvers-types";

export type {
  CreateListingInput,
  ListingDocumentValues,
  GetListingFilters,
} from "../types/listing";

function formatListingValues(
  formData: CreateListingInput,
  hostId: string,
): ListingDocumentValues {
  return {
    type: formData.type,
    host_id: hostId,
    title: formData.title.trim(),
    description: formData.description.trim(),
    price: formData.price,
    location: {
      address: formData.location.address.trim(),
      city: formData.location.city.trim(),
      country: formData.location.country.trim(),
    },
    attributes: {
      beds: formData.attributes.beds,
      bathrooms: formData.attributes.bathrooms,
      max_guests: formData.attributes.max_guests,
      check_in_time: formData.attributes.check_in_time,
      check_out_time: formData.attributes.check_out_time,
      amenities: formData.attributes.amenities ?? [],
      minimum_nights: formData.attributes.minimum_nights,
      property_type: formData.attributes.property_type,
    },
    // New listings start with no photos; they're attached afterwards via
    // the edit flow, once the listing (and its id) already exists.
    photos: [],
  };
}

// Called by GraphQL resolvers — auth is enforced at the resolver layer.
export async function getListing(
  listing_id: string,
): Promise<
  ServiceResult<Awaited<ReturnType<typeof listingsRepo.findListingById>>>
> {
  try {
    const listing = await listingsRepo.findListingById(listing_id);
    return { ok: true, data: listing };
  } catch (error) {
    console.error("[getListing]", error);
    return {
      ok: false,
      error: "Could not retrieve the listing",
      code: "UNEXPECTED",
    };
  }
}

// export type RecordFilters = Pick<GetListingFilters, "availabilityRange">;
export type GetListingsDocumentParams = Omit<
  GetListingFilters,
  "own" | "availabilityRange"
> & { host_id?: string };

export async function getListings(
  filters: InputMaybe<FiltersInput> | null,
): Promise<
  ServiceResult<Awaited<ReturnType<typeof listingsRepo.findListings>>>
> {
  // TODO: Check for user authentication

  let own;
  const limit = filters?.limit || 12;

  if (filters?.own) {
    const auth = await authorize("listings:create");
    if (auth.ok) own = auth.data.id;
  }

  const params: Filter<Document> = {
    ...(filters && filters.term ? { $text: { $search: filters.term } } : {}),
    ...(filters && filters.type ? { type: filters.type } : {}),
    ...(filters && filters.own ? { host_id: own } : {}),
    ...(filters && filters.rating
      ? { rating_avg: { $gte: filters.rating || 3, $lte: 5 } }
      : {}),
    ...(filters && filters.priceRange
      ? { price: { $gte: filters.priceRange[0], $lte: filters.priceRange[1] } }
      : {}),
    ...(filters?.propertyType
      ? { "attributes.property_type": filters.propertyType }
      : {}),
    // Numeric attributes are "at least N" filters: a listing qualifies when it
    // offers the requested capacity or more.
    ...(filters?.beds ? { "attributes.beds": { $gte: filters.beds } } : {}),
    ...(filters?.bathrooms
      ? { "attributes.bathrooms": { $gte: filters.bathrooms } }
      : {}),
    ...(filters?.maxGuests
      ? { "attributes.max_guests": { $gte: filters.maxGuests } }
      : {}),
    // Amenities match on "at least one" of the selected values ($in).
    ...(filters?.amenities && filters.amenities.length > 0
      ? { "attributes.amenities": { $in: filters.amenities } }
      : {}),
  };

  try {
    const [from, to] = filters?.availabilityRange ?? [];
    if (from && to) {
      const bookedIds = await bookingsRepo.findBookedListingIds(from, to);
      if (bookedIds.length > 0)
        params._id = { $nin: bookedIds.map((id) => new ObjectId(id)) };
    }

    const listings = await listingsRepo.findListings(params, limit);
    return { ok: true, data: listings };
  } catch (error) {
    console.error("[getListings]", error);
    return {
      ok: false,
      error: "Could not retrieve the listings",
      code: "UNEXPECTED",
    };
  }
}

export async function getListingsByIds(
  ids: string[],
): Promise<
  ServiceResult<Awaited<ReturnType<typeof listingsRepo.findListingsByIds>>>
> {
  try {
    const listings = await listingsRepo.findListingsByIds(ids);
    return { ok: true, data: listings };
  } catch (error) {
    console.error("[getListingsByIds]", error);
    return {
      ok: false,
      error: "Could not retrieve the listings",
      code: "UNEXPECTED",
    };
  }
}

export async function createListing(
  listingData: CreateListingInput,
): Promise<ServiceResult<string>> {
  const user = await authorize("listings:create"); // Checks that current user is host and has the create permission
  if (!user.ok) return user;

  try {
    const data = formatListingValues(listingData, user.data.id);
    const result = await listingsRepo.createListing(data);
    return {
      ok: true,
      data: result.insertedId.toString(),
    };
  } catch (error) {
    console.error("[createListing]", error);
    return {
      ok: false,
      error: "Could not create the listing",
      code: "UNEXPECTED",
    };
  }
}

export async function deleteListing(
  id: string,
): Promise<ServiceResult<DeleteResult>> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;

  try {
    const deleteResult = await listingsRepo.deleteListing(id);
    revalidatePath("/listings/mine");
    return {
      ok: true,
      data: deleteResult,
    };
  } catch (error) {
    console.error("[deleteListing]", error);
    return {
      ok: false,
      error: "Could not delete the listing",
      code: "UNEXPECTED",
    };
  }
}

export async function editListing(
  id: string,
  values: Partial<EditListingDocumentValues>,
): Promise<ServiceResult> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;

  try {
    const result = await listingsRepo.editListing(id, values);
    revalidatePath("/listings/mine");
    revalidatePath(`/listings/${id}`);
    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    console.error("[editListing]", error);
    return {
      ok: false,
      error: "Could not update the listing",
      code: "UNEXPECTED",
    };
  }
}

export async function removeListingPhoto(
  id: string,
  photoUrl: string,
): Promise<ServiceResult> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;

  try {
    // Mongo is the source of truth for what the listing shows, so drop the
    // reference first. Deleting the S3 object is best-effort: if it's already
    // gone the listing no longer points at it either way, so we
    // just log it instead of failing the whole operation.
    const result = await listingsRepo.pullListingPhoto(id, photoUrl);
    await deleteListingObject(photoUrl).catch((error) =>
      console.error("[removeListingPhoto:s3]", error),
    );

    revalidatePath("/listings/mine");
    revalidatePath(`/listings/${id}`);
    return { ok: true, data: result };
  } catch (error) {
    console.error("[removeListingPhoto]", error);
    return {
      ok: false,
      error: "Could not remove the photo",
      code: "UNEXPECTED",
    };
  }
}

export async function getListingBookings(
  listing_id: string,
): Promise<ServiceResult<Booking[]>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    const bookings = await bookingsRepo.getBookingsByListingId(listing_id);
    return {
      ok: true,
      data: bookings,
    };
  } catch (error) {
    console.error("[getListingBookings]:", error);
    return {
      ok: false,
      error: "Could not retrieve the booked listings",
      code: "NOT_FOUND",
    };
  }
}

export async function getListingAvailability(
  listing_id: string,
): Promise<ServiceResult<Matcher[]>> {
  const auth = await authorize("bookings:create");
  if (!auth.ok) return auth;

  try {
    const bookings = await bookingsRepo.getBookingsByListingId(listing_id);
    const availability = getAvailabilityFromBookings(bookings);
    return {
      ok: true,
      data: availability,
    };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error: "Could not retrieve the listing availability",
      code: "UNEXPECTED",
    };
  }
}
