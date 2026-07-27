import { io, Socket } from "socket.io-client";
import type { SerializableMessageDocument } from "./types/messages";
import { getUserToken } from "./services/auth";

declare global {
  var chatSocket: Socket | undefined;
}

/**
 * The chat wire contract, mirroring `EVENTS` and its companions in the worker
 * (`bookings-app-worker/src/chat/types.ts`). The two repos deploy separately,
 * so this is replicated by hand — same convention the BullMQ payloads follow.
 * It lives beside the connection because that's what carries it.
 */
export const EVENTS = {
  CLIENT_MESSAGE: "client-message",
  SERVER_MESSAGE: "server-message",
  JOIN_CHAT: "join-chat",
  LEAVE_CHAT: "leave-chat",
} as const;

/** Reply the server acks a join with, so the client knows if it was let in. */
export type JoinAck = { ok: boolean };

/**
 * What the client sends on `CLIENT_MESSAGE`. Only the room and the body: the
 * server stamps `_id`, `sender_id` and `timestamp`, which is why this is the
 * delivered message minus everything a client isn't trusted to set.
 */
export type ClientMessage = Pick<
  SerializableMessageDocument,
  "chat_id" | "body"
>;

/**
 * Reply to a `CLIENT_MESSAGE`. The server excludes the sender from the
 * broadcast, so this ack is the only confirmation the sender gets — and it
 * carries the real `_id`, which replaces the temporary one used to render the
 * message optimistically.
 */
export type MessageAck =
  | { ok: true; message: SerializableMessageDocument }
  | { ok: false };

export function getSocketConnection() {
  if (!globalThis.chatSocket) {
    const url =
      process.env.NEXT_PUBLIC_CHAT_SERVER_URL || "http://localhost:4000";

    const socket = io(url, {
      withCredentials: true,
      auth(cb) {
        getUserToken()
          .then((token) => cb({ token }))
          .catch(() => cb({ token: null }));
      },
    });

    // Handle auth, telemetry, logging here because they don't need cleanup and detach
    socket.on("connect", () =>
      console.info("[getSocketConnection]: socket connected"),
    );
    socket.on("disconnect", () => {
      console.info("[getSocketConnection]: socket disconnected");
    });

    globalThis.chatSocket = socket;
    return socket;
  } else {
    return globalThis.chatSocket;
  }
}

// Pure read of the current connection state — never constructs the socket, so
// it's safe as a `useSyncExternalStore` snapshot. The connection is opened by
// whoever calls `getSocketConnection` (the status hook's `subscribe`, the chat
// effects), never by reading this.
export function isSocketConnected() {
  return globalThis.chatSocket?.connected ?? false;
}
