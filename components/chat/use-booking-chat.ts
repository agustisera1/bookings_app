"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getChatHistory } from "@/lib/services/chat";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import type { SerializableChatDocument } from "@/lib/types/chat";
import type { Status } from "./types";
import { getSocketConnection } from "@/lib/socket";

// No-op subscription for now — connect/disconnect events get wired here later.
const subscribe = () => () => {
  // socket.on("connect", () => {});
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

  useEffect(() => {
    let ignore = false;
    const socket = getSocketConnection();
    const onMessageReceived = (msg: SerializableMessageDocument) => {
      setHistory((prev) => [...prev, msg]);
    };

    socket.on("server-message", onMessageReceived);

    getChatHistory(bookingId).then((response) => {
      if (ignore) return;
      if (response.ok) {
        const {
          data: { messages, ...chat },
        } = response;
        setHistory(messages);
        setChatMeta(chat);
        setStatus("ready");
      } else {
        setError(response.error);
        setStatus("error");
      }
    });
    return () => {
      ignore = true;
      socket.off("server-message", onMessageReceived);
    };
  }, [bookingId]);

  return { status, error, history, chatMeta };
}
