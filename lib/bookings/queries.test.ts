import { beforeEach, describe, expect, it, vi } from "vitest";

// Identity and data access mocked at the module border; the policy stays real.
vi.mock("@/lib/auth/session", () => ({ authorize: vi.fn() }));
vi.mock("./repository", () => ({
  findBookingsByGuestId: vi.fn(),
  findBookingById: vi.fn(),
}));
vi.mock("@/lib/listings/repository", () => ({
  findListingById: vi.fn(),
  findListingsByIds: vi.fn(),
}));

import { authorize } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/types";
import * as listingsRepo from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import { MAX_BOOKINGS_PER_LIST } from "./policy";
import { getBooking, getUserBookings } from "./queries";
import * as repo from "./repository";
import type { Booking } from "./types";

const BOOKING_ID = "8f3c2a1e-4b5d-4c6e-9f7a-1b2c3d4e5f60";

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u1",
    email: "guest@x.com",
    name: "Jane",
    is_host: false,
    permissions: ["bookings:view-own-listings"],
    roles: ["guest"],
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: BOOKING_ID,
    listing_id: "L1",
    guest_id: "u1",
    start_date: new Date("2027-01-01T00:00:00.000Z"),
    end_date: new Date("2027-01-05T00:00:00.000Z"),
    status: "accepted",
    status_reason: null,
    total_price: 500,
    created_at: new Date("2026-07-01T00:00:00.000Z"),
    guests: 2,
    refund_amount: 0,
    cancelled_by: null,
    cancelled_at: null,
    ...overrides,
  };
}

const listing = (hostId: string) => ({ _id: "L1", host_id: hostId }) as Listing;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorize).mockResolvedValue({ ok: true, data: user() });
  vi.mocked(repo.findBookingsByGuestId).mockResolvedValue([]);
  vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking());
  vi.mocked(listingsRepo.findListingById).mockResolvedValue(listing("h1"));
});

describe("getUserBookings", () => {
  it("returns the auth failure without hitting the repo", async () => {
    vi.mocked(authorize).mockResolvedValue({ ok: false, error: "Unauthenticated", code: "UNAUTHORIZED" });
    expect(await getUserBookings()).toEqual({ ok: false, error: "Unauthenticated", code: "UNAUTHORIZED" });
    expect(repo.findBookingsByGuestId).not.toHaveBeenCalled();
  });

  it("returns the caller's bookings with their listings, scoped to the authenticated user", async () => {
    const booking = makeBooking();
    const listing = { _id: booking.listing_id } as Listing;
    vi.mocked(repo.findBookingsByGuestId).mockResolvedValue([booking]);
    vi.mocked(listingsRepo.findListingsByIds).mockResolvedValue([listing]);
    expect(await getUserBookings()).toEqual({ ok: true, data: [{ ...booking, listing }] });
    // The id comes from auth, never from the caller.
    expect(repo.findBookingsByGuestId).toHaveBeenCalledWith("u1", MAX_BOOKINGS_PER_LIST);
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(repo.findBookingsByGuestId).mockRejectedValue(new Error("connection reset"));
    expect(await getUserBookings()).toEqual({
      ok: false,
      error: "Could not retrieve your bookings",
      code: "UNEXPECTED",
    });
  });
});

describe("getBooking", () => {
  const NOT_FOUND = { ok: false, error: "Booking not found", code: "NOT_FOUND" };

  it("returns the auth failure without hitting the repo", async () => {
    vi.mocked(authorize).mockResolvedValue({ ok: false, error: "Unauthenticated", code: "UNAUTHORIZED" });
    expect(await getBooking(BOOKING_ID)).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
    expect(repo.findBookingById).not.toHaveBeenCalled();
  });

  it("reads a malformed id as NOT_FOUND without querying", async () => {
    expect(await getBooking("not-a-uuid")).toEqual(NOT_FOUND);
    expect(repo.findBookingById).not.toHaveBeenCalled();
  });

  it("resolves the guest's own booking", async () => {
    const row = makeBooking({ guest_id: "u1" });
    vi.mocked(repo.findBookingById).mockResolvedValue(row);
    expect(await getBooking(BOOKING_ID)).toEqual({
      ok: true,
      data: { booking: row, party: "guest", listing: listing("h1") },
    });
  });

  it("resolves it for the host of the listing", async () => {
    vi.mocked(authorize).mockResolvedValue({ ok: true, data: user({ id: "h1" }) });
    const row = makeBooking({ guest_id: "someone-else" });
    vi.mocked(repo.findBookingById).mockResolvedValue(row);
    expect(await getBooking(BOOKING_ID)).toMatchObject({ ok: true, data: { party: "host" } });
  });

  // A stranger can't tell an existing booking from a missing one.
  it("gives a bystander the same NOT_FOUND as a booking that doesn't exist", async () => {
    vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking({ guest_id: "someone-else" }));
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(listing("another-host"));
    expect(await getBooking(BOOKING_ID)).toEqual(NOT_FOUND);

    vi.mocked(repo.findBookingById).mockResolvedValue(null);
    expect(await getBooking(BOOKING_ID)).toEqual(NOT_FOUND);
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(repo.findBookingById).mockRejectedValue(new Error("connection reset"));
    expect(await getBooking(BOOKING_ID)).toEqual({
      ok: false,
      error: "Could not retrieve the booking",
      code: "UNEXPECTED",
    });
  });
});
