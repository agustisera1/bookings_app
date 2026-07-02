"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as listingsRepo from "../repositories/listings.mongo";
import type {
  CreateListingInput,
  ListingDocumentValues,
} from "../types/listing";

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

export async function viewListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:view");
  if (!auth.ok) return auth;
  console.log("[viewListing]: invocado");
  return { ok: true, data: null };
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

export async function manageListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;
  console.log("[manageListing]: invocado");
  return { ok: true, data: null };
}

export async function createExtendedListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:create-extended");
  if (!auth.ok) return auth;
  console.log("[createExtendedListing]: invocado");
  return { ok: true, data: null };
}

// Called by GraphQL resolvers — auth is enforced at the resolver layer.
export async function getListing(listing_id: string) {
  return listingsRepo.findListingById(listing_id);
}

export async function getListings(args: {
  limit?: number | null;
  term?: string | null;
  own?: boolean;
}) {
  // TODO: Check for user authentication
  const { own, ...rest } = args;
  const params: Parameters<typeof listingsRepo.findListings>[0] = { ...rest };
  if (own) {
    const auth = await authorize("listings:create");
    if (auth.ok) params["host_id"] = auth.data.id;
  }

  return listingsRepo.findListings(params);
}

export async function getListingsByIds(ids: string[]) {
  return listingsRepo.findListingsByIds(ids);
}
