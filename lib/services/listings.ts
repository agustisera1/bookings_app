"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as listingsRepo from "../repositories/listings.mongo";

export async function searchListings(): Promise<ServiceResult> {
  const auth = await authorize("listings:search");
  if (!auth.ok) return auth;

  try {
    const listings = await listingsRepo.findListings({ limit: 20 });
    return { ok: true, data: listings };
  } catch (error) {
    console.error("[searchListings]", error);
    return { ok: false, error: "Could not retrieve listings", code: "UNEXPECTED" };
  }
}

export async function viewListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:view");
  if (!auth.ok) return auth;
  console.log("[viewListing]: invocado");
  return { ok: true, data: null };
}

export async function createListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:create");
  if (!auth.ok) return auth;
  console.log("[createListing]: invocado");
  return { ok: true, data: null };
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
}) {
  // TODO: Check for user authentication
  return listingsRepo.findListings(args);
}

export async function getListingsByIds(ids: string[]) {
  return listingsRepo.findListingsByIds(ids);
}
