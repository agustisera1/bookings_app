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
  findOlderCursor: vi.fn(),
}));
vi.mock("@/lib/bookings/repository", () => ({
  findBookingById: vi.fn(),
  findBookingsByGuestId: vi.fn(),
  findBookingsByListingIds: vi.fn(),
}));
vi.mock("@/lib/listings/repository", () => ({
  findListingById: vi.fn(),
  findListings: vi.fn(),
  findListingsByIds: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { authorize } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/types";
import * as bookingsRepo from "@/lib/bookings/repository";
import type { Booking } from "@/lib/bookings/types";
import * as listingsRepo from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import { getChatThread, getUnreadMessagesCount } from "./queries";
import * as repo from "./repository";

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
  vi.mocked(repo.findChatIdsByUserId).mockResolvedValue(["b1", "b2"]);
  vi.mocked(repo.findReadCursor).mockResolvedValue(CURSOR);
  vi.mocked(repo.countMessagesSince).mockResolvedValue(3);
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
    expect(repo.countMessagesSince).not.toHaveBeenCalled();
  });

  it("counts messages after the cursor, excluding the caller's own", async () => {
    const res = await getUnreadMessagesCount();
    expect(res).toEqual({ ok: true, data: 3 });
    expect(repo.countMessagesSince).toHaveBeenCalledWith(
      ["b1", "b2"],
      "u1",
      CURSOR,
    );
  });

  // A user who never opened the inbox has no cursor: everything counts.
  it("passes a null cursor through instead of inventing one", async () => {
    vi.mocked(repo.findReadCursor).mockResolvedValue(null);
    await getUnreadMessagesCount();
    expect(repo.countMessagesSince).toHaveBeenCalledWith(
      ["b1", "b2"],
      "u1",
      null,
    );
  });

  // Chats are born with their first message, so no chats means no messages —
  // and it keeps an empty `$in` from reaching Mongo.
  it("short-circuits to zero when the user has no chats", async () => {
    vi.mocked(repo.findChatIdsByUserId).mockResolvedValue([]);
    const res = await getUnreadMessagesCount();
    expect(res).toEqual({ ok: true, data: 0 });
    expect(repo.countMessagesSince).not.toHaveBeenCalled();
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(repo.countMessagesSince).mockRejectedValue(
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

describe("getChatThread", () => {
  const BOOKING_ID = "8f3c2a1e-4b5d-4c6e-9f7a-1b2c3d4e5f60";
  const booking = { id: BOOKING_ID, listing_id: "L1", guest_id: "u1" } as Booking;

  beforeEach(() => {
    vi.mocked(bookingsRepo.findBookingById).mockResolvedValue(booking);
    vi.mocked(listingsRepo.findListingById).mockResolvedValue({ host_id: "h1" } as Listing);
    vi.mocked(repo.findChatByBookingId).mockResolvedValue(null);
  });

  it("returns the viewer's side and an empty thread before anyone speaks", async () => {
    expect(await getChatThread(BOOKING_ID, null)).toEqual({
      ok: true,
      data: { chat: null, messages: { items: [], olderCursor: null }, party: "guest" },
    });
    expect(repo.findMessagesByChatId).not.toHaveBeenCalled();
  });

  // Not a party reads the same as a missing booking: it never confirms one exists.
  it("gives a bystander the same NOT_FOUND as a missing booking", async () => {
    const notFound = { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
    vi.mocked(bookingsRepo.findBookingById).mockResolvedValue({ ...booking, guest_id: "other" });
    expect(await getChatThread(BOOKING_ID, null)).toEqual(notFound);

    vi.mocked(bookingsRepo.findBookingById).mockResolvedValue(null);
    expect(await getChatThread(BOOKING_ID, null)).toEqual(notFound);
  });
});
