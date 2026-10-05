import { formatDayLabel, toDayKey, toMillis } from "@/lib/shared/dates";
import type { BookingParty } from "@/lib/bookings/types";
import type { SerializableMessageDocument } from "@/lib/chat/types";
import type { ChatThreadRow, Status, ThreadMessage } from "./types";

// A message plus its display flags (mine, run start/end, day divider), computed from its neighbours.
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

// `connected` is not here on purpose: it comes from the socket via useSyncExternalStore.
export type ThreadState = {
  status: Status;
  error: string | null;
  messages: ThreadMessage[];
  chatMeta: ChatThreadRow["chat"];
  party: BookingParty;
};

// The thread arrives server-rendered; null means the page couldn't load it.
export function initialThreadState(thread: ChatThreadRow | null): ThreadState {
  if (!thread)
    return {
      status: "error",
      error: "Could not load this conversation",
      messages: [],
      chatMeta: null,
      party: "guest",
    };
  return { status: "ready", error: null, messages: thread.messages, chatMeta: thread.chat, party: thread.party };
}

export type ThreadAction =
  | { type: "loaded"; data: ChatThreadRow }
  | { type: "joinFailed" }
  | { type: "appended"; message: ThreadMessage }
  | { type: "delivered"; tempId: string; message: SerializableMessageDocument }
  | { type: "sendFailed"; tempId: string };

export function threadReducer(
  state: ThreadState,
  action: ThreadAction,
): ThreadState {
  switch (action.type) {
    case "loaded":
      // A refresh (mount or reconnect) replaces the thread with server truth.
      return initialThreadState(action.data);
    case "joinFailed":
      return { ...state, status: "error", error: "Could not join chat" };
    case "appended":
      // One case for both an incoming message and the sender's own optimistic
      // bubble — both just land at the end of the thread.
      return { ...state, messages: [...state.messages, action.message] };
    case "delivered":
      // Ack landed: swap the optimistic bubble for the server's copy, real id
      // and all.
      return {
        ...state,
        messages: state.messages.map((m) =>
          m._id === action.tempId ? action.message : m,
        ),
      };
    case "sendFailed":
      // Timed out or refused: keep the text on screen but flag it, instead of
      // leaving the bubble "pending" forever.
      return {
        ...state,
        messages: state.messages.map((m) =>
          m._id === action.tempId ? { ...m, pending: false, failed: true } : m,
        ),
      };
  }
}
