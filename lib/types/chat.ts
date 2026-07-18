import { WithId } from "mongodb";
import { SerializableMessageDocument } from "./messages";
import type { BookingParty, GuestBooking } from "./booking";

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

/**
 * A row in the messages rail. Derived from a booking (whose id doubles as the
 * chat id) plus the listing it points at — so it carries the booking's shape,
 * not the thread's: no last message, no unread count. Those need a dedicated
 * chats query; see the note on `getUserConversations`.
 */
export type Conversation = Pick<
  GuestBooking,
  "id" | "title" | "start_date" | "end_date" | "status"
> & {
  photo: string | null;
  /** The viewer's side of this booking. The counterpart is the other one. */
  party: BookingParty;
};
