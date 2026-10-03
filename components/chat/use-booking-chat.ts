"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useSyncExternalStore,
} from "react";
import { getChatHistory } from "@/lib/services/chat";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import {
  EVENTS,
  getSocketConnection,
  isSocketConnected,
  type ClientMessage,
  type JoinAck,
  type MessageAck,
} from "@/lib/socket";
import { initialThreadState, threadReducer } from "./thread-model";

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
export function useBookingChat(bookingId: string, currentUserId: string) {
  const [state, dispatch] = useReducer(threadReducer, initialThreadState);
  const connected = useSocketStatus();

  // A reconnect reloads the thread and mints a new ticket, which re-joins the room here.
  useEffect(() => {
    if (!state.ticket) return;
    const socket = getSocketConnection();

    socket.emit(EVENTS.JOIN_CHAT, state.ticket, (res: JoinAck) => {
      if (!res.ok) dispatch({ type: "joinFailed" });
    });

    return () => {
      socket.emit(EVENTS.LEAVE_CHAT, bookingId);
    };
  }, [bookingId, state.ticket]);

  // Initial load, live messages, and a reload on every reconnect.
  useEffect(() => {
    const socket = getSocketConnection();
    let ignore = false;

    // A fresh load recovers missed messages and mints a ticket that re-fires the join.
    const load = async () => {
      const response = await getChatHistory(bookingId);
      if (ignore) return;
      if (response.ok) dispatch({ type: "loaded", data: response.data });
      else dispatch({ type: "loadFailed", error: response.error });
    };

    const onMessageReceived = (message: SerializableMessageDocument) =>
      dispatch({ type: "appended", message });

    void load();
    socket.on(EVENTS.SERVER_MESSAGE, onMessageReceived);
    // `reconnect` is a manager event — fires only on a successful re-connection,
    // never the first connect, so mount doesn't double-fetch.
    socket.io.on("reconnect", load);

    return () => {
      ignore = true;
      socket.off(EVENTS.SERVER_MESSAGE, onMessageReceived);
      socket.io.off("reconnect", load);
    };
  }, [bookingId]);

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
    viewerParty: state.parties?.current_party || "guest",
    connected,
    sendMessage,
  };
}
