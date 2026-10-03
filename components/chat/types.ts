import type { BookingParty } from "@/lib/types/booking";
import type { SerializableMessageDocument } from "@/lib/types/messages";

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
