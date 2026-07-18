import { formatDayLabel, toDayKey, toMillis } from "@/lib/dates";
import type { ThreadMessage } from "./types";

/**
 * A message enriched with the display flags a thread needs, computed from its
 * neighbours: whether it's mine, whether it opens/closes a run of consecutive
 * messages from the same sender, and the day divider label when the day changes.
 *
 * Pure, framework-free logic kept out of the rendering components so it can be
 * tested on its own (cohesion/coupling rule in CLAUDE.md).
 */
export type ThreadItem = {
  message: ThreadMessage;
  isMine: boolean;
  isRunStart: boolean;
  isRunEnd: boolean;
  dayLabel: string | null;
};

export function buildThread(
  messages: ThreadMessage[],
  currentUserId: string,
  now: Date,
): ThreadItem[] {
  const ordered = [...messages].sort(
    (a, b) => toMillis(a.timestamp) - toMillis(b.timestamp),
  );

  return ordered.map((message, i) => {
    const prev = ordered[i - 1];
    const next = ordered[i + 1];

    const newDay =
      !prev || toDayKey(prev.timestamp) !== toDayKey(message.timestamp);
    const senderChanged = !prev || prev.sender_id !== message.sender_id;
    const nextNewDay =
      !next || toDayKey(next.timestamp) !== toDayKey(message.timestamp);
    const nextSenderChanged = !next || next.sender_id !== message.sender_id;

    return {
      message,
      isMine: message.sender_id === currentUserId,
      isRunStart: newDay || senderChanged,
      isRunEnd: nextNewDay || nextSenderChanged,
      dayLabel: newDay ? formatDayLabel(message.timestamp, now) : null,
    };
  });
}
