"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { EmptyThread, ErrorState, ThreadSkeleton } from "./chat-states";
import { MessageThread } from "./message-thread";
import type { Counterpart } from "./types";
import { useBookingChat } from "./use-booking-chat";

export default function Chat({
  bookingId,
  currentUserId,
}: {
  bookingId: string;
  currentUserId: string;
}) {
  const { status, error, history, chatMeta } = useBookingChat(bookingId);
  // Captured once at mount: a stable "now" for relative day labels keeps render pure.
  const [now] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // The viewer is one of the two parties; the counterpart is the other side.
  const viewerIsGuest = chatMeta ? chatMeta.guest_id === currentUserId : true;
  const counterpart: Counterpart = viewerIsGuest ? "Host" : "Guest";

  // Pin to the latest message whenever the thread settles.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [status, history.length]);

  return (
    <div className="mx-auto flex h-[70vh] max-h-[720px] min-h-[440px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <ChatHeader
        counterpart={counterpart}
        startedAt={chatMeta?.started_at}
        status={status}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
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
            now={now}
          />
        )}
      </div>

      <ChatComposer counterpart={counterpart} />
    </div>
  );
}
