import { io, type Socket } from "socket.io-client";
import { getUserToken } from "@/lib/auth/actions";
import type { ServiceResult } from "@/lib/shared/result";
import type { SerializableMessageDocument } from "@/lib/chat/types";

// The chat wire contract, mirrored by hand in greenaway-worker/src/chat/types.ts
// (the repos deploy separately). It travels as the socket's generics.
export const EVENTS = {
  CLIENT_MESSAGE: "client-message",
  SERVER_MESSAGE: "server-message",
  JOIN_CHAT: "join-chat",
  LEAVE_CHAT: "leave-chat",
} as const;

export type DeliveredMessage = Omit<SerializableMessageDocument, "_id"> & { id: string };

// The server stamps everything else: the client is never trusted with it.
export type ClientMessage = Pick<DeliveredMessage, "chat_id" | "body">;

export type Ack<T> = ServiceResult<T>;

export interface ServerToClientEvents {
  [EVENTS.SERVER_MESSAGE]: (message: DeliveredMessage) => void;
}

export interface ClientToServerEvents {
  [EVENTS.JOIN_CHAT]: (chatId: string, ack: (res: Ack<null>) => void) => void;
  [EVENTS.LEAVE_CHAT]: (chatId: string) => void;
  [EVENTS.CLIENT_MESSAGE]: (
    payload: ClientMessage,
    ack: (res: Ack<DeliveredMessage>) => void,
  ) => void;
}

type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

declare global {
  var chatSocket: ChatSocket | undefined;
}

// Built idle: ChatConnection decides when it's connected.
export function getChatSocket(): ChatSocket {
  if (!globalThis.chatSocket) {
    const url =
      process.env.NEXT_PUBLIC_CHAT_SERVER_URL || "http://localhost:4000";

    const socket: ChatSocket = io(url, {
      autoConnect: false,
      withCredentials: true,
      // Runs on every connect, so a new session hands over its own token.
      auth(cb) {
        getUserToken()
          .then((result) => cb({ token: result.ok ? result.data : null }))
          .catch(() => cb({ token: null }));
      },
    });

    // Handle auth, telemetry, logging here because they don't need cleanup and detach
    socket.on("connect", () =>
      console.info("[getChatSocket]: socket connected"),
    );
    socket.on("disconnect", () => {
      console.info("[getChatSocket]: socket disconnected");
    });

    globalThis.chatSocket = socket;
    return socket;
  } else {
    return globalThis.chatSocket;
  }
}

// Never constructs the socket, so it's a safe `useSyncExternalStore` snapshot.
export function isSocketConnected() {
  return globalThis.chatSocket?.connected ?? false;
}
