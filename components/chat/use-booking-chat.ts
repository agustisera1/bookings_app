"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import type { SerializableMessageDocument } from "@/lib/chat/types";
import {
  EVENTS,
  getSocketConnection,
  isSocketConnected,
  type ClientMessage,
  type JoinAck,
  type MessageAck,
} from "@/lib/chat/socket";
import { initialThreadState, threadReducer } from "./thread-model";
import type { ChatThreadRow } from "./types";

// Without a timeout, a message whose ack never arrives would stay "pending" forever.
const SEND_TIMEOUT_MS = 10_000;

// The socket lives outside React, so `connected` is read via useSyncExternalStore;
// the snapshot reads the boolean without constructing the socket.
function subscribe(onStoreChange: () => void) {
  const socket = getSocketConnection();
  socket.on("connect", onStoreChange);
  socket.on("disconnect", onStoreChange);
  socket.on("connect_error", onStoreChange);
  return () => {
    socket.off("connect", onStoreChange);
    socket.off("disconnect", onStoreChange);
    socket.off("connect_error", onStoreChange);
  };
}

export function useSocketStatus() {
  return useSyncExternalStore(subscribe, isSocketConnected, () => false);
}

// Optimistic sends use reducer state, not `useOptimistic`: that rolls back on settle,
// but a sent message must stay and the server never echoes it to its sender.
export function useBookingChat(
  bookingId: string,
  currentUserId: string,
  thread: ChatThreadRow | null,
) {
  const router = useRouter();
  const [state, dispatch] = useReducer(threadReducer, thread, initialThreadState);
  const connected = useSocketStatus();

  // A refresh hands down a new `thread`: server truth replaces the local one.
  useEffect(() => {
    if (thread) dispatch({ type: "loaded", data: thread });
  }, [thread]);

  // Joins on mount and after every reconnect; a reconnect also refreshes the
  // page to recover the messages missed while the socket was down.
  useEffect(() => {
    const socket = getSocketConnection();

    const join = () =>
      socket.emit(EVENTS.JOIN_CHAT, bookingId, (res: JoinAck) => {
        if (!res.ok) dispatch({ type: "joinFailed" });
      });
    const onReconnect = () => {
      join();
      router.refresh();
    };
    const onMessageReceived = (message: SerializableMessageDocument) =>
      dispatch({ type: "appended", message });

    join();
    socket.on(EVENTS.SERVER_MESSAGE, onMessageReceived);
    // `reconnect` is a manager event: it never fires on the first connect.
    socket.io.on("reconnect", onReconnect);

    return () => {
      socket.emit(EVENTS.LEAVE_CHAT, bookingId);
      socket.off(EVENTS.SERVER_MESSAGE, onMessageReceived);
      socket.io.off("reconnect", onReconnect);
    };
  }, [bookingId, router]);

  const sendMessage = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      // A temporary id so the bubble can render now and be located again when
      // the ack arrives. It never reaches the server — Mongo mints the real one.
      const tempId = crypto.randomUUID();
      dispatch({
        type: "appended",
        message: {
          _id: tempId,
          chat_id: bookingId,
          sender_id: currentUserId,
          body: trimmed,
          timestamp: new Date().toISOString(),
          pending: true,
        },
      });

      const payload: ClientMessage = { chat_id: bookingId, body: trimmed };
      getSocketConnection()
        .timeout(SEND_TIMEOUT_MS)
        .emit(
          EVENTS.CLIENT_MESSAGE,
          payload,
          (err: Error | null, res?: MessageAck) => {
            if (err || !res || !res.ok) dispatch({ type: "sendFailed", tempId });
            else dispatch({ type: "delivered", tempId, message: res.message });
          },
        );
    },
    [bookingId, currentUserId],
  );

  return {
    status: state.status,
    error: state.error,
    history: state.messages,
    chatMeta: state.chatMeta,
    viewerParty: state.party,
    connected,
    sendMessage,
  };
}
