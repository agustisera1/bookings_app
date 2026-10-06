import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/shared/dates";
import { DayDivider, MessageBubble } from "./message-bubble";
import { buildThread } from "./thread-model";
import type { Counterpart, ThreadMessage } from "./types";

export function MessageThread({
  messages,
  currentUserId,
  counterpart,
  startedAt,
  olderHref,
  now,
}: {
  messages: ThreadMessage[];
  currentUserId: string;
  counterpart: Counterpart;
  startedAt?: string;
  olderHref?: string;
  now: Date;
}) {
  const items = buildThread(messages, currentUserId, now);

  return (
    <div className="flex flex-col">
      {olderHref ? (
        <Button
          variant="ghost"
          size="sm"
          className="mx-auto mb-4"
          nativeButton={false}
          render={<Link href={olderHref} scroll={false} />}
        >
          Load older messages
        </Button>
      ) : (
        <p className="mx-auto mb-4 max-w-xs text-balance text-center text-xs text-muted-foreground">
          The beginning of your conversation with your {counterpart.toLowerCase()}
          {startedAt ? ` · ${formatDate(startedAt)}` : ""}
        </p>
      )}

      {items.map(({ message, isMine, isRunStart, isRunEnd, dayLabel }) => (
        <div key={message.id}>
          {dayLabel && <DayDivider label={dayLabel} />}
          <MessageBubble
            body={message.body}
            time={isRunEnd ? formatTime(message.timestamp) : null}
            isMine={isMine}
            isRunStart={isRunStart}
            counterpart={counterpart}
            pending={message.pending}
            failed={message.failed}
          />
        </div>
      ))}
    </div>
  );
}
