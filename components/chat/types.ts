/** Load state of the chat history fetch. */
export type Status = "loading" | "error" | "ready";

/**
 * The other party in the conversation, relative to the viewer. Derived by
 * comparing the current user against the chat's guest/host — never a name we
 * don't have, only the role on the other side.
 */
export type Counterpart = "Host" | "Guest";
