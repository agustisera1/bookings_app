import type { BookingParty } from "@/lib/bookings/types";
import type {
  GetChatThreadQuery,
  GetConversationsQuery,
} from "@/lib/apollo/__generated__/operations";
import type { SerializableMessageDocument } from "@/lib/chat/types";

// `pending` and `failed` are client-only states of an optimistic message; never persisted.
export type ThreadMessage = SerializableMessageDocument & {
  pending?: boolean;
  failed?: boolean;
};

/** Load state of the chat history fetch. */
export type Status = "loading" | "error" | "ready";

// The other party's role relative to the viewer; we never have their name.
export type Counterpart = "Host" | "Guest";

// Defined once next to its type: the thread and the rail both need the flip.
export function counterpartOf(viewerParty: BookingParty): Counterpart {
  return viewerParty === "guest" ? "Host" : "Guest";
}

/** A row of the messages rail, as GraphQL delivers it. */
export type ConversationRow = NonNullable<GetConversationsQuery["conversations"]>[number];

/** A thread as the page loads it: messages, chat meta (null until someone speaks) and the viewer's side. */
export type ChatThreadRow = NonNullable<GetChatThreadQuery["chatThread"]>;
