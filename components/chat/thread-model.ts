import { formatDayLabel, toDayKey, toMillis } from "@/lib/dates";
import type { ChatParties } from "@/lib/types/booking";
import type { ChatHistory, SerializableChatDocument } from "@/lib/types/chat";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import type { Status, ThreadMessage } from "./types";

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
  chatMeta: SerializableChatDocument | null;
  parties: ChatParties | null;
  ticket: string | null;
};

export const initialThreadState: ThreadState = {
  status: "loading",
  error: null,
  messages: [],
  chatMeta: null,
  parties: null,
  ticket: null,
};

export type ThreadAction =
  | { type: "loaded"; data: ChatHistory }
  | { type: "loadFailed"; error: string }
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
      // A load (mount or reconnect) replaces the thread with server truth — and
      // carries the fresh ticket the join effect re-fires on.
      return {
        status: "ready",
        error: null,
        messages: action.data.messages,
        chatMeta: action.data.chat,
        parties: action.data.parties,
        ticket: action.data.ticket,
      };
    case "loadFailed":
      return { ...state, status: "error", error: action.error };
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
