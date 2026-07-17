import mongoClientPromise from "../mongo";
import {
  MessageDocument,
  SerializableMessageDocument,
} from "../types/messages";

async function getCollection() {
  const client = await mongoClientPromise;
  const collection = client
    .db("messagesdb")
    .collection<MessageDocument>("messages");
  return collection;
}

//** NOTE: Takes the booking_id as identifier for the chat */
export async function findMessagesByChatId(
  chatId: string,
): Promise<SerializableMessageDocument[]> {
  const collection = await getCollection();
  const documents = await collection.find({ chat_id: chatId }).toArray();
  // Project the ObjectId `_id` to a string so the service returns a domain type.
  return documents.map((document) => ({
    ...document,
    _id: document._id.toString(),
  }));
}
