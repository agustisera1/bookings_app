import { formatDate, formatTime } from "@/lib/dates";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import { DayDivider, MessageBubble } from "./message-bubble";
import { buildThread } from "./thread-model";
import type { Counterpart } from "./types";

export function MessageThread({
  messages,
  currentUserId,
  counterpart,
  startedAt,
  now,
}: {
  messages: SerializableMessageDocument[];
  currentUserId: string;
  counterpart: Counterpart;
  startedAt?: string;
  now: Date;
}) {
  const items = buildThread(messages, currentUserId, now);

  return (
    <div className="flex flex-col">
      <p className="mx-auto mb-4 max-w-xs text-balance text-center text-xs text-muted-foreground">
        The beginning of your conversation with your {counterpart.toLowerCase()}
        {startedAt ? ` · ${formatDate(startedAt)}` : ""}
      </p>

      {items.map(({ message, isMine, isRunStart, isRunEnd, dayLabel }) => (
        <div key={message._id}>
          {dayLabel && <DayDivider label={dayLabel} />}
          <MessageBubble
            body={message.body}
            time={isRunEnd ? formatTime(message.timestamp) : null}
            isMine={isMine}
            isRunStart={isRunStart}
            counterpart={counterpart}
          />
        </div>
      ))}
    </div>
  );
}
