"use client";

import { useState, type KeyboardEvent } from "react";
import { SendHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Counterpart } from "./types";
import { useSocketContext } from "./context";
import { EVENTS, type ClientMessage } from "@/lib/socket";

export function ChatComposer({
  bookingId,
  counterpart,
}: {
  bookingId: string;
  counterpart: Counterpart;
}) {
  const { socket } = useSocketContext();
  const [body, setBody] = useState("");

  function sendMessage() {
    const trimmed = body.trim();
    if (!trimmed) return;
    // The booking id doubles as the chat room id (chat_id) on the worker side.
    const payload: ClientMessage = { chat_id: bookingId, body: trimmed };
    socket?.emit(EVENTS.CLIENT_MESSAGE, payload);
    setBody("");
  }

  // Enter sends; Shift+Enter inserts a newline.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    // The bar inherits the surface it sits on and is anchored by the hairline;
    // previously it painted itself `card` over a darker pane, which is what made
    // it read as a floating slab. The field keeps `border-input`, the one token
    // with enough contrast to stay visible on both `card` and `background`.
    <div className="border-t border-foreground/10 px-4 py-3 sm:px-6">
      <div className="flex items-end gap-1.5 rounded-2xl border border-input bg-muted p-1.5">
        <Textarea
          rows={1}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message your ${counterpart.toLowerCase()}…`}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100"
        />
        <Button
          size="icon"
          className="size-9 shrink-0 rounded-xl"
          aria-label="Send message"
          onClick={sendMessage}
          disabled={!body.trim()}
        >
          <SendHorizontalIcon />
        </Button>
      </div>
    </div>
  );
}
