"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getChatHistory } from "@/lib/services/chat";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import type { SerializableChatDocument } from "@/lib/types/chat";
import type { BookingParty } from "@/lib/types/booking";
import type { Status } from "./types";
import { EVENTS, getSocketConnection, type JoinAck } from "@/lib/socket";

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

/** Loads a booking's chat history and splits it into meta + messages. */
export function useBookingChat(bookingId: string) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SerializableMessageDocument[]>([]);
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

  return { status, error, history, chatMeta, viewerParty };
}
