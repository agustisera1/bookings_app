"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { EmptyThread, ErrorState, ThreadSkeleton } from "./chat-states";
import { MessageThread } from "./message-thread";
import { counterpartOf } from "./types";
import { useBookingChat } from "./use-booking-chat";
import { SocketProvider } from "./context";
import { cn } from "@/lib/utils";

export default function Chat({
  bookingId,
  currentUserId,
  fill = false,
}: {
  bookingId: string;
  currentUserId: string;
  /**
   * Fill the parent instead of sizing itself as a standalone card. Set by the
   * messages view, where the pane owns the height; left off wherever the chat
   * is embedded in a normal page flow.
   */
  fill?: boolean;
}) {
  const { status, error, history, chatMeta, viewerParty } =
    useBookingChat(bookingId);
  // Captured once at mount: a stable "now" for relative day labels keeps render pure.
  const [now] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // The side comes from the server, which resolved it against the booking's
  // guest and the listing's owner. Deriving it here from `chatMeta` used to
  // fall back to "guest" whenever the chat document didn't exist yet, so a host
  // opening a fresh thread was told they were talking to their host.
  const counterpart = counterpartOf(viewerParty);

  // Pin to the latest message whenever the thread settles.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [status, history.length]);

  return (
    <SocketProvider>
      <div
        className={cn(
          "flex flex-col overflow-hidden",
          fill
            ? // Inherit the pane's `background`, which is a step darker than
              // `card`. That contrast is what sets the thread apart from the
              // rail, so painting it `card` here would flatten the two together.
              "h-full min-h-0 flex-1"
            : "mx-auto h-[70vh] max-h-[720px] min-h-[440px] w-full max-w-2xl rounded-2xl border bg-card shadow-sm",
        )}
      >
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

        <ChatComposer bookingId={bookingId} counterpart={counterpart} />
      </div>
    </SocketProvider>
  );
}
