import type { WithId } from "mongodb";
import type { BookingParty, BookingStatus } from "@/lib/bookings/types";

export type ChatDocument = WithId<{
  booking_id: string;
  started_at: Date;
  guest_id: string;
  host_id: string;
}>;

export type SerializableChatDocument = Omit<ChatDocument, "_id"> & { _id: string };

export type MessageDocument = WithId<{
  chat_id: string;
  sender_id: string;
  timestamp: Date;
  body: string;
}>;

export type SerializableMessageDocument = Omit<MessageDocument, "_id"> & { _id: string };

// The only persisted read state: unread = later messages I didn't send. One per user.
export type MessageReadCursor = {
  user_id: string;
  last_seen_at: Date;
};

export type ChatMessagePage = {
  items: SerializableMessageDocument[];
  olderCursor: Date | null;
};

// `chat` is null until someone speaks: an empty thread, not a failure.
export type ChatThread = {
  chat: SerializableChatDocument | null;
  messages: ChatMessagePage;
  party: BookingParty;
};

// A row in the messages rail: a booking (whose id is the chat id) plus its listing.
export type Conversation = {
  id: string;
  title: string;
  photo: string | null;
  start_date: Date;
  end_date: Date;
  status: BookingStatus;
  party: BookingParty;
};
