import mongoClientPromise from "@/lib/mongo";
import { Document, Filter, InsertOneResult, ObjectId, WithId } from "mongodb";
import {
  EditListingDocumentValues,
  ListingDocumentValues,
} from "../types/listing";

async function getCollection() {
  const client = await mongoClientPromise;
  return client.db("listingsdb").collection<ListingDocumentValues>("listings");
}

export async function findListingById(id: string) {
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() };
}

export async function findListings(
  filtering: Filter<Document>,
  limit?: number | null,
) {
  const collection = await getCollection();
  const cursor = collection.find(filtering);
  const docs = await (limit ? cursor.limit(limit) : cursor).toArray();
  return docs.map((doc) => ({ ...doc, _id: doc._id.toString() }));
}

export async function findListingsByIds(
  ids: string[],
): Promise<WithId<Document>[]> {
  const collection = await getCollection();
  const filtering: Filter<Document> = {};
  if (ids.length > 0)
    filtering["_id"] = { $in: ids.map((id) => new ObjectId(id)) };
  return collection.find(filtering).toArray();
}

export async function createListing(
  listing: ListingDocumentValues,
): Promise<InsertOneResult<Document>> {
  const collection = await getCollection();
  return await collection.insertOne(listing);
}

export async function deleteListing(id: string) {
  const collection = await getCollection();
  return await collection.deleteOne({ _id: new ObjectId(id) });
}

export async function editListing(
  listing_id: string,
  values: Partial<EditListingDocumentValues>,
) {
  const collection = await getCollection();
  return await collection.updateOne(
    { _id: new ObjectId(listing_id) },
    { $set: values },
  );
}

export async function pullListingPhoto(listing_id: string, photoUrl: string) {
  const collection = await getCollection();
  return await collection.updateOne(
    { _id: new ObjectId(listing_id) },
    { $pull: { photos: photoUrl } },
  );
}
