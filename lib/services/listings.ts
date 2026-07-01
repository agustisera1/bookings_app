"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import mongoClientPromise from "@/lib/mongo";
import { Document, Filter, ObjectId } from "mongodb";

export async function searchListings(): Promise<ServiceResult> {
  const auth = await authorize("listings:search");
  if (!auth.ok) return auth;

  const client = await mongoClientPromise;
  const db = client.db("listingsdb");
  const listings = await db.collection("listings").find({}).limit(20).toArray();

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

export async function getListing(listing_id: string) {
  const client = await mongoClientPromise;
  const doc = await client
    .db("listingsdb")
    .collection("listings")
    .findOne({ _id: new ObjectId(listing_id) });

  return doc ? { ...doc, _id: doc._id.toString() } : null;
}

export async function getListings({
  limit,
  term,
}: {
  limit?: number | null;
  term?: string | null;
}) {
  // TODO: Check for user authentication
  const filtering: Filter<Document> = {};
  if (term) filtering["$text"] = { $search: term };

  const mongoClient = await mongoClientPromise;
  const cursor = mongoClient
    .db("listingsdb")
    .collection("listings")
    .find(filtering);

  const docs = await (limit ? cursor.limit(limit) : cursor).toArray();
  return docs.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
  }));
}

export async function getListingsByIds(ids: string[]) {
  const filtering: Filter<Document> = {};
  if (!!ids?.length)
    filtering["_id"] = { $in: ids.map((id) => new ObjectId(id!)) };
  const mongoClient = await mongoClientPromise;
  const cursor = mongoClient
    .db("listingsdb")
    .collection("listings")
    .find(filtering);

  return await cursor.toArray();
}
