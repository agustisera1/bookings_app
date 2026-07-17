import { WithId } from "mongodb";
import { SerializableMessageDocument } from "./messages";

export type ChatDocument = WithId<{
  booking_id: string;
  started_at: string;
  guest_id: string;
  host_id: string;
}>;

export type SerializableChatDocument = Omit<ChatDocument, "_id"> & {
  _id: string;
};

export type ChatHistory = SerializableChatDocument & {
  messages: SerializableMessageDocument[];
};
