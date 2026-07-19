import type { BookingParty } from "@/lib/types/booking";
import type { SerializableMessageDocument } from "@/lib/types/messages";

/**
 * A message as the thread holds it. Same shape the server stores, plus the two
 * client-only states an optimistically rendered message passes through: shown
 * before the server has confirmed it (`pending`), and shown after the server
 * refused or failed to store it (`failed`). Neither is ever persisted.
 */
export type ThreadMessage = SerializableMessageDocument & {
  pending?: boolean;
  failed?: boolean;
};

/** Load state of the chat history fetch. */
export type Status = "loading" | "error" | "ready";

/**
 * The other party in the conversation, relative to the viewer. Derived by
 * comparing the current user against the chat's guest/host — never a name we
 * don't have, only the role on the other side.
 */
export type Counterpart = "Host" | "Guest";

/**
 * The label for whoever sits across from `viewerParty`. Lives next to the type
 * it produces so the flip is defined once: the thread and the rail both need
 * it, and two copies is how they drift.
 */
export function counterpartOf(viewerParty: BookingParty): Counterpart {
  return viewerParty === "guest" ? "Host" : "Guest";
}
