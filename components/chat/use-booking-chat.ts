"use client";

import { useEffect, useState } from "react";
import { getChatHistory } from "@/lib/services/chat";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import type { SerializableChatDocument } from "@/lib/types/chat";
import type { Status } from "./types";

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
    };
  }, [bookingId]);

  return { status, error, history, chatMeta };
}
