"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { EmptyThread, ErrorState, ThreadSkeleton } from "./chat-states";
import { MessageThread } from "./message-thread";
import { counterpartOf, type ChatThreadRow } from "./types";
import { useBookingChat } from "./use-booking-chat";

export default function Chat({
  bookingId,
  currentUserId,
  thread,
}: {
  bookingId: string;
  currentUserId: string;
  thread: ChatThreadRow | null;
}) {
  const { status, error, history, olderCursor, chatMeta, viewerParty, connected, sendMessage } =
    useBookingChat(bookingId, currentUserId, thread);
  // Captured once at mount: a stable "now" for relative day labels keeps render pure.
  const [now] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // The side comes from the server; deriving it from `chatMeta` mislabels a host on a fresh thread.
  const counterpart = counterpartOf(viewerParty);

  // Pin to the latest message when one lands; loading older ones leaves the scroll alone.
  const latestId = history.at(-1)?.id;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [status, latestId]);

  const olderHref = olderCursor
    ? `/messages/${bookingId}?from=${encodeURIComponent(olderCursor)}`
    : undefined;

  return (
    // Inherits the pane's `background`, a step darker than the rail: that
    // contrast is what sets the thread apart, so it never paints `card`.
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ChatHeader
        counterpart={counterpart}
        startedAt={chatMeta?.started_at}
        status={status}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        aria-live="polite"
      >
        {status === "loading" && <ThreadSkeleton />}
        {status === "error" && <ErrorState message={error} />}
        {status === "ready" && history.length === 0 && (
          <EmptyThread counterpart={counterpart} />
        )}
        {status === "ready" && history.length > 0 && (
          <MessageThread
            messages={history}
            currentUserId={currentUserId}
            counterpart={counterpart}
            startedAt={chatMeta?.started_at}
            olderHref={olderHref}
            now={now}
          />
        )}
      </div>

      <ChatComposer
        counterpart={counterpart}
        connected={connected}
        onSend={sendMessage}
      />
    </div>
  );
}
