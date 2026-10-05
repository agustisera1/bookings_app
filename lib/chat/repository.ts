import mongoClientPromise from "@/lib/infra/mongo";
import type {
  ChatDocument,
  MessageDocument,
  MessageReadCursor,
  SerializableChatDocument,
  SerializableMessageDocument,
} from "./types";

async function chats() {
  return (await mongoClientPromise).db("chatsdb").collection<ChatDocument>("chats");
}

async function messages() {
  return (await mongoClientPromise).db("messagesdb").collection<MessageDocument>("messages");
}

async function readCursors() {
  return (await mongoClientPromise).db("messagesdb").collection<MessageReadCursor>("read_cursors");
}

// By `booking_id`: the key messages reference their thread with (`chat_id`).
export async function findChatIdsByUserId(userId: string): Promise<string[]> {
  const documents = await (await chats())
    .find({ $or: [{ guest_id: userId }, { host_id: userId }] })
    .project<Pick<ChatDocument, "booking_id">>({ booking_id: 1, _id: 0 })
    .toArray();
  return documents.map((document) => document.booking_id);
}

export async function findChatByBookingId(
  bookingId: string,
): Promise<SerializableChatDocument | null> {
  const document = await (await chats()).findOne({ booking_id: bookingId });
  return document ? { ...document, _id: document._id.toString() } : null;
}

// The last 50, oldest first: sorted descending so the limit cuts the old end.
export async function findMessagesByChatId(chatId: string): Promise<SerializableMessageDocument[]> {
  const documents = await (await messages())
    .find({ chat_id: chatId })
    .sort({ timestamp: -1 })
    .limit(50)
    .toArray();
  return documents.reverse().map((document) => ({ ...document, _id: document._id.toString() }));
}

export async function findReadCursor(userId: string): Promise<string | null> {
  const document = await (await readCursors()).findOne({ user_id: userId });
  return document?.last_seen_at ?? null;
}

export async function upsertReadCursor(userId: string, lastSeenAt: string): Promise<void> {
  await (await readCursors()).updateOne(
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
  return (await messages()).countDocuments({
    chat_id: { $in: chatIds },
    sender_id: { $ne: excludeSenderId },
    // ISO-8601 UTC sorts lexicographically in time order: `$gt` compares strings.
    ...(since ? { timestamp: { $gt: since } } : {}),
  });
}
