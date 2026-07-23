import { describe, expect, it } from "vitest";
import type { ChatParties } from "@/lib/types/booking";
import type { ChatHistory, SerializableChatDocument } from "@/lib/types/chat";
import type { SerializableMessageDocument } from "@/lib/types/messages";
import type { ThreadMessage } from "./types";
import {
  buildThread,
  initialThreadState,
  threadReducer,
  type ThreadState,
} from "./thread-model";

function msg(
  id: string,
  sender: string,
  at: number,
  extra: Partial<ThreadMessage> = {},
): ThreadMessage {
  return { _id: id, chat_id: "c1", sender_id: sender, timestamp: String(at), body: "hi", ...extra };
}

const AUG1_0900 = new Date(2026, 7, 1, 9, 0).getTime();
const AUG1_0901 = new Date(2026, 7, 1, 9, 1).getTime();
const AUG1_1000 = new Date(2026, 7, 1, 10, 0).getTime();
const AUG2_0900 = new Date(2026, 7, 2, 9, 0).getTime();

describe("buildThread", () => {
  const now = new Date(2026, 7, 2, 12, 0);
  // Deliberately out of order to prove the thread sorts a copy chronologically.
  const source = [
    msg("c", "u2", AUG1_1000),
    msg("a", "u1", AUG1_0900),
    msg("d", "u1", AUG2_0900),
    msg("b", "u1", AUG1_0901),
  ];
  const thread = buildThread(source, "u1", now);

  it("orders messages chronologically without mutating the input", () => {
    expect(thread.map((t) => t.message._id)).toEqual(["a", "b", "c", "d"]);
    expect(source.map((m) => m._id)).toEqual(["c", "a", "d", "b"]);
  });

  it("flags a message as mine by sender", () => {
    expect(thread.map((t) => t.isMine)).toEqual([true, true, false, true]);
  });

  it("opens a run on a new day or a sender change", () => {
    expect(thread.map((t) => t.isRunStart)).toEqual([true, false, true, true]);
  });

  it("closes a run before the next day or the next sender", () => {
    expect(thread.map((t) => t.isRunEnd)).toEqual([false, true, true, true]);
  });

  it("shows a day divider only on the first message of a day", () => {
    expect(thread.map((t) => t.dayLabel)).toEqual(["Yesterday", null, null, "Today"]);
  });
});

describe("threadReducer", () => {
  const parties: ChatParties = {
    chat_id: "c1",
    host_id: "h",
    guest_id: "g",
    current_party: "guest",
  };
  const chat: SerializableChatDocument = {
    _id: "chat1",
    booking_id: "c1",
    started_at: "2026-08-01T09:00:00.000Z",
    guest_id: "g",
    host_id: "h",
  };

  it("replaces the thread with server truth on 'loaded'", () => {
    const history: ChatHistory = {
      chat,
      messages: [msg("a", "g", AUG1_0900)],
      parties,
      ticket: "tok",
    };
    expect(threadReducer(initialThreadState, { type: "loaded", data: history })).toEqual({
      status: "ready",
      error: null,
      messages: history.messages,
      chatMeta: chat,
      parties,
      ticket: "tok",
    });
  });

  it("appends a message on 'appended'", () => {
    const state: ThreadState = { ...initialThreadState, messages: [msg("a", "g", AUG1_0900)] };
    const next = threadReducer(state, { type: "appended", message: msg("b", "h", AUG1_0901) });
    expect(next.messages.map((m) => m._id)).toEqual(["a", "b"]);
  });

  it("swaps the optimistic bubble for the server copy on 'delivered'", () => {
    const state: ThreadState = {
      ...initialThreadState,
      messages: [msg("temp", "g", AUG1_0900, { pending: true })],
    };
    const server: SerializableMessageDocument = {
      _id: "real",
      chat_id: "c1",
      sender_id: "g",
      timestamp: String(AUG1_0900),
      body: "hi",
    };
    const next = threadReducer(state, { type: "delivered", tempId: "temp", message: server });
    expect(next.messages).toEqual([server]);
  });

  it("marks the bubble failed (not pending) on 'sendFailed'", () => {
    const state: ThreadState = {
      ...initialThreadState,
      messages: [msg("temp", "g", AUG1_0900, { pending: true })],
    };
    const next = threadReducer(state, { type: "sendFailed", tempId: "temp" });
    expect(next.messages[0]).toMatchObject({ _id: "temp", pending: false, failed: true });
  });

  it("goes to an error state on 'joinFailed'", () => {
    const next = threadReducer(initialThreadState, { type: "joinFailed" });
    expect(next.status).toBe("error");
    expect(next.error).toBe("Could not join chat");
  });
});
