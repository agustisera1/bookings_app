import mongoClientPromise from "../mongo";
import {
  MessageDocument,
  MessageReadCursor,
  SerializableMessageDocument,
} from "../types/messages";

async function getCollection() {
  const client = await mongoClientPromise;
  const collection = client
    .db("messagesdb")
    .collection<MessageDocument>("messages");
  return collection;
}

async function getCursorCollection() {
  const client = await mongoClientPromise;
  return client
    .db("messagesdb")
    .collection<MessageReadCursor>("read_cursors");
}

//** NOTE: Takes the booking_id as identifier for the chat */
export async function findMessagesByChatId(
  chatId: string,
): Promise<SerializableMessageDocument[]> {
  const collection = await getCollection();
  const documents = await collection
    .find({ chat_id: chatId })
    // Descendente para que el `limit` corte por la cola del hilo, no por el principio;
    // el orden cronológico se restaura con el `reverse` de abajo.
    .sort({ timestamp: -1 })
    .limit(50)
    .toArray();
  // Project the ObjectId `_id` to a string so the service returns a domain type.
  return documents.reverse().map((document) => ({
    ...document,
    _id: document._id.toString(),
  }));
}

export async function findReadCursor(userId: string): Promise<string | null> {
  const collection = await getCursorCollection();
  const document = await collection.findOne({ user_id: userId });
  return document?.last_seen_at ?? null;
}

export async function upsertReadCursor(userId: string, lastSeenAt: string) {
  const collection = await getCursorCollection();
  await collection.updateOne(
    { user_id: userId },
    { $set: { last_seen_at: lastSeenAt } },
    { upsert: true },
  );
}

export async function countMessagesSince(
  chatIds: string[],
  excludeSenderId: string,
  since: string | null,
): Promise<number> {
  const collection = await getCollection();
  return collection.countDocuments({
    chat_id: { $in: chatIds },
    sender_id: { $ne: excludeSenderId },
    // `timestamp` se guarda como ISO-8601 en UTC, cuyo orden lexicográfico
    // coincide con el cronológico: `$gt` compara strings sin convertir a Date.
    ...(since ? { timestamp: { $gt: since } } : {}),
  });
}
