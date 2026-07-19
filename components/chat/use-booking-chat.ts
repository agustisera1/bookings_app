"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getChatHistory } from "@/lib/services/chat";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import type { SerializableChatDocument } from "@/lib/types/chat";
import type { BookingParty } from "@/lib/types/booking";
import type { Status, ThreadMessage } from "./types";
import {
  EVENTS,
  getSocketConnection,
  type ClientMessage,
  type JoinAck,
  type MessageAck,
} from "@/lib/socket";

// No-op subscription for now — connect/disconnect events get wired here later.
const subscribe = () => () => {
  // socket.on("connect", () => {})
  // socket.on("connect_error", () => {});
  // socket.on("disconnect", () => {});
};

export function useSocket() {
  const socket = useSyncExternalStore(
    subscribe,
    () => getSocketConnection(), // client: the shared singleton (stable ref)
    () => null, // server: don't open a connection during SSR
  );
  return { socket };
}

/**
 * Loads a booking's chat history, keeps it in step with the socket, and sends.
 *
 * Sending is optimistic: the message is appended immediately under a temporary
 * id and swapped for the server's copy when the ack lands. Note this is plain
 * `useState`, not `useOptimistic` — the latter ties optimistic state to an async
 * transition and rolls it back when that transition settles, which is right for
 * a Server Action but wrong here: a sent message has to *stay* on screen, and
 * the server never echoes it back to its sender.
 */
export function useBookingChat(bookingId: string, currentUserId: string) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ThreadMessage[]>([]);
  const [chatMeta, setChatMeta] = useState<SerializableChatDocument | null>(
    null,
  );
  // Comes from the server, which knows the ownership; `guest` is only the
  // placeholder until the fetch lands.
  const [viewerParty, setViewerParty] = useState<BookingParty>("guest");

  useEffect(() => {
    const socket = getSocketConnection();

    // The ack is the last argument of `emit` — socket.io recognises it by
    // position and calls it with whatever the server passes to `ack(...)`.
    // (`emitWithAck` is the promise-based variant and takes no callback.)
    socket.emit(EVENTS.JOIN_CHAT, bookingId, (res: JoinAck) => {
      if (!res.ok) {
        setError("Could not join chat");
        setStatus("error");
      }
    });

    return () => {
      socket.emit(EVENTS.LEAVE_CHAT, bookingId);
    };
  }, [bookingId]);

  useEffect(() => {
    let ignore = false;
    const socket = getSocketConnection();
    const onMessageReceived = (msg: SerializableMessageDocument) => {
      setHistory((prev) => [...prev, msg]);
    };

    getChatHistory(bookingId).then((response) => {
      if (ignore) return;
      if (response.ok) {
        const { chat, messages, viewerParty } = response.data;
        setHistory(messages);
        setChatMeta(chat);
        setViewerParty(viewerParty);
        setStatus("ready");
      } else {
        setError(response.error);
        setStatus("error");
      }
    });

    socket.on(EVENTS.SERVER_MESSAGE, onMessageReceived);

    return () => {
      ignore = true;
      socket.off(EVENTS.SERVER_MESSAGE, onMessageReceived);
    };
  }, [bookingId]);

  const sendMessage = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      // A temporary id so the bubble can render and be located again when the
      // ack arrives. It never reaches the server — the real one is minted by
      // Mongo on insert.
      const tempId = crypto.randomUUID();
      setHistory((prev) => [
        ...prev,
        {
          _id: tempId,
          chat_id: bookingId,
          sender_id: currentUserId,
          body: trimmed,
          timestamp: new Date().toISOString(),
          pending: true,
        },
      ]);

      const payload: ClientMessage = { chat_id: bookingId, body: trimmed };
      getSocketConnection().emit(
        EVENTS.CLIENT_MESSAGE,
        payload,
        (res: MessageAck) => {
          setHistory((prev) =>
            prev.map((message) => {
              if (message._id !== tempId) return message;
              // Confirmed: adopt the server's copy, real id and all. Refused or
              // dropped: keep the text on screen but flag it, so the user sees
              // what didn't send instead of losing it silently.
              return res.ok
                ? res.message
                : { ...message, pending: false, failed: true };
            }),
          );
        },
      );
    },
    [bookingId, currentUserId],
  );

  return { status, error, history, chatMeta, viewerParty, sendMessage };
}
