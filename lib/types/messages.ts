import { WithId } from "mongodb";

export type MessageDocument = WithId<{
  chat_id: string;
  sender_id: string;
  timestamp: string;
  body: string;
}>;

export type SerializableMessageDocument = Omit<MessageDocument, "_id"> & {
  _id: string;
};
