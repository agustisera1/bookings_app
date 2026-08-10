import { beforeEach, describe, expect, it, vi } from "vitest";

// Same seams as reviews.test.ts: identity and data access mocked at the module
// border. `signToken` comes along because chat.ts imports it at the top level.
vi.mock("../authorize", () => ({ authorize: vi.fn() }));
vi.mock("../jwt", () => ({ signToken: vi.fn(() => "ticket") }));
vi.mock("../repositories/chat.mongo", () => ({
  findChatIdsByUserId: vi.fn(),
  findChatByBookingId: vi.fn(),
}));
vi.mock("../repositories/messages.mongo", () => ({
  findReadCursor: vi.fn(),
  upsertReadCursor: vi.fn(),
  countMessagesSince: vi.fn(),
  findMessagesByChatId: vi.fn(),
}));
vi.mock("../repositories/bookings.pg", () => ({
  getBookingById: vi.fn(),
  findBookingsByGuestId: vi.fn(),
  getBookingsByListingIds: vi.fn(),
}));
vi.mock("../repositories/listings.mongo", () => ({
  findListingById: vi.fn(),
  findListings: vi.fn(),
  findListingsByIds: vi.fn(),
}));

import { authorize } from "../authorize";
import * as chatsRepo from "../repositories/chat.mongo";
import * as messagesRepo from "../repositories/messages.mongo";
import type { CurrentUser } from "../types/user";
import { getUnreadMessagesCount, markMessagesAsSeen } from "./chat";

const CURSOR = "2026-08-01T00:00:00.000Z";

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u1",
    email: "guest@x.com",
    name: "Jane",
    is_host: false,
    permissions: ["chat:view-own"],
    roles: ["guest"],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorize).mockResolvedValue({ ok: true, data: user() });
  vi.mocked(chatsRepo.findChatIdsByUserId).mockResolvedValue(["b1", "b2"]);
  vi.mocked(messagesRepo.findReadCursor).mockResolvedValue(CURSOR);
  vi.mocked(messagesRepo.countMessagesSince).mockResolvedValue(3);
});

describe("getUnreadMessagesCount", () => {
  it("returns the auth failure without touching the repos", async () => {
    vi.mocked(authorize).mockResolvedValue({
      ok: false,
      error: "Forbidden",
      code: "FORBIDDEN",
    });
    const res = await getUnreadMessagesCount();
    expect(res).toEqual({ ok: false, error: "Forbidden", code: "FORBIDDEN" });
    expect(messagesRepo.countMessagesSince).not.toHaveBeenCalled();
  });

  it("counts messages after the cursor, excluding the caller's own", async () => {
    const res = await getUnreadMessagesCount();
    expect(res).toEqual({ ok: true, data: 3 });
    expect(messagesRepo.countMessagesSince).toHaveBeenCalledWith(
      ["b1", "b2"],
      "u1",
      CURSOR,
    );
  });

  // A user who never opened the inbox has no cursor: everything counts.
  it("passes a null cursor through instead of inventing one", async () => {
    vi.mocked(messagesRepo.findReadCursor).mockResolvedValue(null);
    await getUnreadMessagesCount();
    expect(messagesRepo.countMessagesSince).toHaveBeenCalledWith(
      ["b1", "b2"],
      "u1",
      null,
    );
  });

  // Chats are born with their first message, so no chats means no messages —
  // and it keeps an empty `$in` from reaching Mongo.
  it("short-circuits to zero when the user has no chats", async () => {
    vi.mocked(chatsRepo.findChatIdsByUserId).mockResolvedValue([]);
    const res = await getUnreadMessagesCount();
    expect(res).toEqual({ ok: true, data: 0 });
    expect(messagesRepo.countMessagesSince).not.toHaveBeenCalled();
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(messagesRepo.countMessagesSince).mockRejectedValue(
      new Error("connection reset"),
    );
    const res = await getUnreadMessagesCount();
    expect(res).toEqual({
      ok: false,
      error: "Could not load your unread messages",
      code: "UNEXPECTED",
    });
  });
});

describe("markMessagesAsSeen", () => {
  it("returns the auth failure without moving the cursor", async () => {
    vi.mocked(authorize).mockResolvedValue({
      ok: false,
      error: "Forbidden",
      code: "FORBIDDEN",
    });
    const res = await markMessagesAsSeen();
    expect(res).toEqual({ ok: false, error: "Forbidden", code: "FORBIDDEN" });
    expect(messagesRepo.upsertReadCursor).not.toHaveBeenCalled();
  });

  it("moves the caller's cursor to now", async () => {
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    const res = await markMessagesAsSeen();
    expect(res).toEqual({ ok: true, data: null });
    expect(messagesRepo.upsertReadCursor).toHaveBeenCalledWith(
      "u1",
      "2026-08-10T12:00:00.000Z",
    );
    vi.useRealTimers();
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(messagesRepo.upsertReadCursor).mockRejectedValue(
      new Error("connection reset"),
    );
    const res = await markMessagesAsSeen();
    expect(res).toEqual({
      ok: false,
      error: "Could not update your messages",
      code: "UNEXPECTED",
    });
  });
});
