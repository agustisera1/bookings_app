import mongoClientPromise from "@/lib/mongo";
import { Document, Filter, InsertOneResult, ObjectId, WithId } from "mongodb";
import { ListingDocumentValues } from "../types/listing";

async function getCollection() {
  const client = await mongoClientPromise;
  return client.db("listingsdb").collection("listings");
}

export async function findListingById(id: string) {
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? { ...doc, _id: doc._id.toString() } : null;
}

export async function findListings({
  limit,
  term,
}: {
  limit?: number | null;
  term?: string | null;
}) {
  const collection = await getCollection();
  const filtering: Filter<Document> = {};
  if (term) filtering["$text"] = { $search: term };

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
  const document = await collection.insertOne(listing);
  return document;
}

// export async function editListing(
//   id: string,
//   values: Partial<ListingFormData>,
// ): Promise<UpdateOneModel<Document>> {
//   const collection = await getCollection();
//   // // const filters = {};
//   // updated = await collection.findOneAndUpdate();
//   // return;
//   return
// }
