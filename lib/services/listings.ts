"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import mongoClientPromise from "@/lib/mongo";

export async function searchListings(): Promise<ServiceResult> {
  const auth = await authorize("listings:search");
  if (!auth.ok) return auth;

  const client = await mongoClientPromise;
  const db = client.db("listingsdb");
  const listings = await db.collection("listings").find({}).limit(10).toArray();

  return { ok: true, data: listings };
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
