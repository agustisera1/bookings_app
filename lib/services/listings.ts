"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as listingsRepo from "../repositories/listings.mongo";
import * as bookingsRepo from "../repositories/bookings.pg";
import { deleteListingObject } from "../s3";
import type {
  CreateListingInput,
  EditListingDocumentValues,
  ListingDocumentValues,
} from "../types/listing";
import { DeleteResult } from "mongodb";
import { revalidatePath } from "next/cache";
import { Booking } from "./bookings";

export type {
  CreateListingInput,
  ListingDocumentValues,
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

export async function getListings(args: {
  limit?: number | null;
  term?: string | null;
  own?: boolean;
}): Promise<
  ServiceResult<Awaited<ReturnType<typeof listingsRepo.findListings>>>
> {
  // TODO: Check for user authentication
  const { own, ...rest } = args;
  const params: Parameters<typeof listingsRepo.findListings>[0] = { ...rest };
  if (own) {
    const auth = await authorize("listings:create");
    if (auth.ok) params["host_id"] = auth.data.id;
  }

  try {
    const listings = await listingsRepo.findListings(params);
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
