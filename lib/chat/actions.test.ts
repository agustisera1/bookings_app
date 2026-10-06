import { beforeEach, describe, expect, it, vi } from "vitest";

// Identity and data access mocked at the module border; the policy stays real.
vi.mock("@/lib/auth/session", () => ({ authorize: vi.fn() }));
vi.mock("./repository", () => ({
  findChatIdsByUserId: vi.fn(),
  findChatByBookingId: vi.fn(),
  findReadCursor: vi.fn(),
  upsertReadCursor: vi.fn(),
  countMessagesSince: vi.fn(),
  findMessagesByChatId: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { authorize } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/types";
import { markMessagesAsSeen } from "./actions";
import * as repo from "./repository";

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
    expect(repo.upsertReadCursor).not.toHaveBeenCalled();
  });

  it("moves the caller's cursor to now", async () => {
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    const res = await markMessagesAsSeen();
    expect(res).toEqual({ ok: true, data: null });
    expect(repo.upsertReadCursor).toHaveBeenCalledWith(
      "u1",
      new Date("2026-08-10T12:00:00.000Z"),
    );
    vi.useRealTimers();
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(repo.upsertReadCursor).mockRejectedValue(
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
