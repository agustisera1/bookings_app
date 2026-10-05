"use server";
import { authorize } from "@/lib/auth/session";
import { addListingObject, deleteListingObject } from "@/lib/infra/s3";
import type { ServiceResult } from "@/lib/shared/result";
import { revalidatePaths, type RevalidationTarget } from "@/lib/shared/revalidate";
import * as repo from "./repository";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
  createListingInputSchema,
  editListingSchema,
  isAcceptedPhotoType,
  listingIdSchema,
  type CreateListingInput,
  type EditListingInput,
} from "./validation";

const LISTING_VIEWS: RevalidationTarget[] = [{ path: "/listings" }, { path: "/listings/mine" }];

const listingViews = (id: string): RevalidationTarget[] => [
  ...LISTING_VIEWS,
  { path: `/listings/${id}` },
];

export async function createListing(input: CreateListingInput): Promise<ServiceResult<string>> {
  const auth = await authorize("listings:create");
  if (!auth.ok) return auth;

  const parsed = createListingInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  const { attributes, ...listing } = parsed.data;

  try {
    // Photos are attached afterwards, once the listing (and its id) exists.
    const result = await repo.createListing({
      ...listing,
      host_id: auth.data.id,
      attributes: { ...attributes, amenities: attributes.amenities ?? [] },
      photos: [],
    });
    revalidatePaths(LISTING_VIEWS);
    return { ok: true, data: result.insertedId.toString() };
  } catch (error) {
    console.error("[createListing]", error);
    return { ok: false, error: "Could not create the listing", code: "UNEXPECTED" };
  }
}

export async function deleteListing(listingId: string): Promise<ServiceResult<null>> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;

  const id = listingIdSchema.safeParse(listingId);
  if (!id.success) return { ok: false, error: id.error.issues[0].message, code: "VALIDATION" };

  try {
    await repo.deleteListing(id.data);
    revalidatePaths(LISTING_VIEWS);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[deleteListing]", error);
    return { ok: false, error: "Could not delete the listing", code: "UNEXPECTED" };
  }
}

export async function editListing(
  listingId: string,
  input: EditListingInput,
): Promise<ServiceResult<null>> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;

  const id = listingIdSchema.safeParse(listingId);
  if (!id.success) return { ok: false, error: id.error.issues[0].message, code: "VALIDATION" };

  const values = editListingSchema.safeParse(input);
  if (!values.success)
    return { ok: false, error: values.error.issues[0].message, code: "VALIDATION" };

  try {
    await repo.editListing(id.data, values.data);
    revalidatePaths(listingViews(id.data));
    return { ok: true, data: null };
  } catch (error) {
    console.error("[editListing]", error);
    return { ok: false, error: "Could not update the listing", code: "UNEXPECTED" };
  }
}

export async function addListingPhoto(listingId: string, file: File): Promise<ServiceResult<string>> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;

  const id = listingIdSchema.safeParse(listingId);
  if (!id.success) return { ok: false, error: id.error.issues[0].message, code: "NOT_FOUND" };

  if (!isAcceptedPhotoType(file.type))
    return { ok: false, error: "Photos must be PNG, JPEG or WebP", code: "VALIDATION" };

  if (file.size > MAX_PHOTO_BYTES)
    return { ok: false, error: `Photos must be under ${MAX_PHOTO_MB} MB`, code: "VALIDATION" };

  try {
    const listing = await repo.findListingById(id.data);
    if (!listing) return { ok: false, error: "Listing not found", code: "NOT_FOUND" };

    // `listings:manage-own` doesn't say *which* listing: without this the upload
    // writes into any host's photo prefix (RNF-05).
    if (listing.host_id !== auth.data.id)
      return { ok: false, error: "You can only add photos to your own listings", code: "FORBIDDEN" };

    const url = await addListingObject(file, id.data);
    if (!url) return { ok: false, error: "Could not upload the photo", code: "UNEXPECTED" };

    return { ok: true, data: url };
  } catch (error) {
    console.error("[addListingPhoto]", error);
    return { ok: false, error: "Could not upload the photo", code: "UNEXPECTED" };
  }
}

export async function removeListingPhoto(
  listingId: string,
  photoUrl: string,
): Promise<ServiceResult<null>> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;

  const id = listingIdSchema.safeParse(listingId);
  if (!id.success) return { ok: false, error: id.error.issues[0].message, code: "VALIDATION" };

  try {
    await repo.pullListingPhoto(id.data, photoUrl);
    // Mongo is the source of truth: a failed S3 delete leaves an orphan, not a broken listing.
    await deleteListingObject(photoUrl).catch((error) =>
      console.error("[removeListingPhoto:s3]", error),
    );
    revalidatePaths(listingViews(id.data));
    return { ok: true, data: null };
  } catch (error) {
    console.error("[removeListingPhoto]", error);
    return { ok: false, error: "Could not remove the photo", code: "UNEXPECTED" };
  }
}
