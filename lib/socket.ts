import { io, Socket } from "socket.io-client";
import type { SerializableMessageDocument } from "./types/messages";

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

export function getSocketConnection() {
  if (!globalThis.chatSocket) {
    const url =
      process.env.NEXT_PUBLIC_CHAT_SERVER_URL || "http://localhost:4000";

    const socket = io(url, {
      withCredentials: true,
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
