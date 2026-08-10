import mongoClientPromise from "../mongo";
import { ChatDocument, SerializableChatDocument } from "../types/chat";

async function getCollection() {
  const client = await mongoClientPromise;
  const collection = client.db("chatsdb").collection<ChatDocument>("chats");
  return collection;
}

/**
 * Los chats en los que el usuario es parte, por su `booking_id` — que es la
 * clave con la que los mensajes referencian su hilo (`chat_id`).
 */
export async function findChatIdsByUserId(userId: string): Promise<string[]> {
  const collection = await getCollection();
  const documents = await collection
    .find({ $or: [{ guest_id: userId }, { host_id: userId }] })
    .project<Pick<ChatDocument, "booking_id">>({ booking_id: 1, _id: 0 })
    .toArray();
  return documents.map((document) => document.booking_id);
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
