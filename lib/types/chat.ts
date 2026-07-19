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

/**
 * A booking's thread as the UI consumes it.
 *
 * `chat` is nullable on purpose: the document is only written once someone
 * speaks, so a booking nobody has messaged yet has messages but no chat meta.
 * That's an empty conversation, not a failure — keeping it nullable is what
 * stops the UI from reporting "couldn't load" for a thread that simply hasn't
 * started.
 */
export type ChatHistory = {
  chat: SerializableChatDocument | null;
  messages: SerializableMessageDocument[];
  /**
   * Which side of the booking the caller is on. Resolved server-side, where
   * ownership is known, so the UI never has to guess it from `chat` — which is
   * null until someone speaks.
   */
  viewerParty: BookingParty;
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
