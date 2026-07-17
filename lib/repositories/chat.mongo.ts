import mongoClientPromise from "../mongo";
import { ChatDocument, SerializableChatDocument } from "../types/chat";

async function getCollection() {
  const client = await mongoClientPromise;
  const collection = client.db("chatsdb").collection<ChatDocument>("chats");
  return collection;
}

export async function findChatByBookingId(
  bookingId: string,
): Promise<SerializableChatDocument | null> {
  const collection = await getCollection();
  const document = await collection.findOne({ booking_id: bookingId });
  // Project the ObjectId `_id` to a string so callers get a domain type, never
  // a raw DB document (same convention as listings/notifications repos).
  return document ? { ...document, _id: document._id.toString() } : null;
}
