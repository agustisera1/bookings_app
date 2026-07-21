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

// A message whose ack never arrives (worker down mid-flight) would sit
// "pending" forever. socket.io's `timeout` fires the ack with an error once
// this elapses, so the bubble can be marked failed instead.
const SEND_TIMEOUT_MS = 10_000;

// Reactive connection state. The socket lives outside React, so `connected` has
// to be observed through useSyncExternalStore: `subscribe` wires React's
// callback to the connection events; the snapshot is the boolean itself, read
// without constructing the socket so it stays side-effect-free (the connection
// opens here in `subscribe`). See docs/insights/USE_SYNC_EXTERNAL_STORE.md.
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

/**
 * Loads a booking's thread, keeps it in step with the socket, and sends.
 *
 * Every transition lives in `threadReducer` (pure, in thread-model); this hook
 * only wires I/O to it — fetch, socket events, sending — and dispatches intent.
 * Sending is optimistic: the bubble is appended at once under a temporary id and
 * swapped for the server's copy when the ack lands. It's plain reducer state,
 * not `useOptimistic`: that hook rolls its value back when the async transition
 * settles, but a sent message has to *stay* on screen, and the server never
 * echoes it back to its sender.
 */
export function useBookingChat(bookingId: string, currentUserId: string) {
  const [state, dispatch] = useReducer(threadReducer, initialThreadState);
  const connected = useSocketStatus();

  // Join (and re-join) the room whenever a fresh ticket lands. A reconnect
  // reloads the thread, which mints a new ticket, which re-fires this — so the
  // brand-new socket, which joined no rooms on its own, gets put back in.
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

    // A fresh load recovers messages missed while offline and mints a new
    // ticket — which re-fires the join effect above. So one reload covers
    // reconnection end to end.
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
