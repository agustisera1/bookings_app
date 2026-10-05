import { beforeEach, describe, expect, it, vi } from "vitest";

// Identity and data access mocked at the module border; the policy, the zod
// schemas and pgErrorToCode stay real (the Pool is lazy and never queried).
vi.mock("@/lib/auth/session", () => ({ authorize: vi.fn() }));
vi.mock("./repository", () => ({
  insertBooking: vi.fn(),
  findBookingById: vi.fn(),
  updateBooking: vi.fn(),
}));
vi.mock("@/lib/listings/repository", () => ({ findListingById: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { authorize } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/types";
import * as listingsRepo from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import { acceptBooking, cancelBooking, createBooking, rejectBooking } from "./actions";
import * as repo from "./repository";
import type { Booking } from "./types";

const BOOKING_ID = "8f3c2a1e-4b5d-4c6e-9f7a-1b2c3d4e5f60";
const LISTING_ID = "64b7f0c2a1b2c3d4e5f60718";

function guestUser(): CurrentUser {
  return {
    id: "u1",
    email: "guest@x.com",
    name: "Jane",
    is_host: false,
    permissions: ["bookings:create", "bookings:cancel-own"],
    roles: ["guest"],
  };
}

function hostUser(): CurrentUser {
  return {
    id: "h1",
    email: "host@x.com",
    name: "Carlos",
    is_host: true,
    permissions: ["bookings:manage", "listings:create"],
    roles: ["guest", "host"],
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: BOOKING_ID,
    listing_id: LISTING_ID,
    guest_id: "u1",
    // Far future so `canCancel` allows and the refund window is open by default.
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

const listing = (hostId: string) => ({ _id: LISTING_ID, host_id: hostId }) as Listing;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorize).mockResolvedValue({ ok: true, data: guestUser() });
  vi.mocked(repo.insertBooking).mockResolvedValue({
    id: BOOKING_ID,
    created_at: new Date("2026-07-01T00:00:00.000Z"),
  });
  vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking());
  vi.mocked(repo.updateBooking).mockResolvedValue(true);
  vi.mocked(listingsRepo.findListingById).mockResolvedValue(listing("h1"));
});

describe("createBooking", () => {
  const params = {
    listingId: LISTING_ID,
    checkIn: new Date("2026-08-01T00:00:00.000Z"),
    checkOut: new Date("2026-08-05T00:00:00.000Z"),
    guests: 2,
    totalPrice: 500,
  };

  it("stops at the auth gate", async () => {
    vi.mocked(authorize).mockResolvedValue({ ok: false, error: "Forbidden", code: "FORBIDDEN" });
    expect(await createBooking(params)).toEqual({ ok: false, error: "Forbidden", code: "FORBIDDEN" });
    expect(repo.insertBooking).not.toHaveBeenCalled();
  });

  it("rejects a check-out that isn't after check-in, before touching the repo", async () => {
    const res = await createBooking({ ...params, checkOut: params.checkIn });
    expect(res).toEqual({ ok: false, error: "Check-out must be after check-in", code: "VALIDATION" });
    expect(repo.insertBooking).not.toHaveBeenCalled();
  });

  it("takes the guest from auth and writes the outbox event with the booking", async () => {
    expect((await createBooking(params)).ok).toBe(true);
    expect(repo.insertBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        listing_id: LISTING_ID,
        guest_id: "u1",
        start_date: params.checkIn,
        end_date: params.checkOut,
      }),
      expect.objectContaining({ type: "booking.created" }),
    );
  });

  // Drizzle wraps the driver error: the pg code arrives in `cause`.
  it("turns the overlap exclusion (23P01) into a friendly CONFLICT", async () => {
    vi.mocked(repo.insertBooking).mockRejectedValue(
      new Error("Failed query", { cause: { code: "23P01" } }),
    );
    expect(await createBooking(params)).toEqual({
      ok: false,
      error: "These dates are no longer available. Please select different dates.",
      code: "CONFLICT",
    });
  });

  it("reports any other failure as UNEXPECTED", async () => {
    vi.mocked(repo.insertBooking).mockRejectedValue(new Error("connection reset"));
    expect(await createBooking(params)).toEqual({
      ok: false,
      error: "Could not complete your booking",
      code: "UNEXPECTED",
    });
  });
});

describe("cancelBooking", () => {
  it("refuses when the caller has no standing over the booking", async () => {
    vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking({ guest_id: "someone-else" }));
    expect(await cancelBooking(BOOKING_ID)).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(repo.updateBooking).not.toHaveBeenCalled();
  });

  it("blocks a cancellation the policy rejects, without writing", async () => {
    vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking({ status: "cancelled" }));
    expect(await cancelBooking(BOOKING_ID)).toEqual({
      ok: false,
      error: "This booking is already cancelled",
      code: "VALIDATION",
    });
    expect(repo.updateBooking).not.toHaveBeenCalled();
  });

  it("writes the cancellation with the refund the policy decided", async () => {
    expect(await cancelBooking(BOOKING_ID)).toEqual({
      ok: true,
      data: { id: BOOKING_ID, refundAmount: 500 },
    });
    expect(repo.updateBooking).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.objectContaining({ status: "cancelled", cancelled_by: "guest", refund_amount: 500 }),
      expect.objectContaining({ type: "booking.cancelled" }),
    );
  });
});

describe("acceptBooking", () => {
  beforeEach(() => {
    vi.mocked(authorize).mockResolvedValue({ ok: true, data: hostUser() });
  });

  it("forbids a host who does not own the listing", async () => {
    vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking({ status: "pending" }));
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(listing("other"));
    expect(await acceptBooking(BOOKING_ID)).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(repo.updateBooking).not.toHaveBeenCalled();
  });

  it("rejects a booking that is not pending", async () => {
    expect(await acceptBooking(BOOKING_ID)).toEqual({
      ok: false,
      error: "This booking is already accepted",
      code: "VALIDATION",
    });
    expect(repo.updateBooking).not.toHaveBeenCalled();
  });

  it("accepts a pending booking", async () => {
    vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking({ status: "pending" }));
    expect((await acceptBooking(BOOKING_ID)).ok).toBe(true);
    expect(repo.updateBooking).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.objectContaining({ status: "accepted" }),
      expect.objectContaining({ type: "booking.accepted" }),
    );
  });
});

describe("rejectBooking", () => {
  beforeEach(() => {
    vi.mocked(authorize).mockResolvedValue({ ok: true, data: hostUser() });
  });

  it("steers an already-accepted booking to cancellation instead", async () => {
    expect(await rejectBooking(BOOKING_ID)).toEqual({
      ok: false,
      error:
        "This booking was already accepted. Cancel it instead: the guest will be refunded in full.",
      code: "VALIDATION",
    });
    expect(repo.updateBooking).not.toHaveBeenCalled();
  });

  it("rejects a pending booking", async () => {
    vi.mocked(repo.findBookingById).mockResolvedValue(makeBooking({ status: "pending" }));
    expect((await rejectBooking(BOOKING_ID)).ok).toBe(true);
    expect(repo.updateBooking).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.objectContaining({ status: "rejected" }),
      expect.objectContaining({ type: "booking.rejected" }),
    );
  });
});
