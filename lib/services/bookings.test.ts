import { beforeEach, describe, expect, it, vi } from "vitest";

// Seams mockeados en el borde de módulo. Los que crean conexiones en el import
// (../events → BullMQ/Redis) o arrastran next/headers (../authorize) van con
// factory para no ejecutar su top-level. Quedan REALES ../postgres
// (pgErrorToCode; el Pool es lazy y nunca se consulta) y ../bookings/policy (puro).
vi.mock("../authorize", () => ({ authorize: vi.fn() }));
vi.mock("../repositories/bookings.pg", () => ({
  findBookingsByGuestId: vi.fn(),
  createBookingRecord: vi.fn(),
  getBookingById: vi.fn(),
  updateBooking: vi.fn(),
}));
vi.mock("../repositories/listings.mongo", () => ({ findListingById: vi.fn() }));
vi.mock("../repositories/users.pg", () => ({ findUserById: vi.fn() }));
vi.mock("./notifications", () => ({
  queueNotification: vi.fn(() => Promise.resolve({ ok: true, data: undefined })),
}));
vi.mock("../events", () => ({
  emailQueue: { add: vi.fn(() => Promise.resolve({ id: "job-1" })) },
  toBookingEmailPayload: vi.fn(() => ({})),
  pgBookingToEmailBooking: vi.fn(() => ({})),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { authorize } from "../authorize";
import * as bookingsRepo from "../repositories/bookings.pg";
import * as listingsRepo from "../repositories/listings.mongo";
import * as usersRepo from "../repositories/users.pg";
import type { Booking } from "../types/booking";
import type { CurrentUser } from "../types/user";
import {
  acceptBooking,
  cancelBooking,
  createBooking,
  getUserBookings,
  rejectBooking,
} from "./bookings";

type Ret<T extends (...a: never[]) => unknown> = Awaited<ReturnType<T>>;

function guestUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u1",
    email: "guest@x.com",
    name: "Jane",
    is_host: false,
    permissions: ["bookings:create", "bookings:cancel-own", "bookings:view-own-listings"],
    roles: ["guest"],
    ...overrides,
  };
}

function hostUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "h1",
    email: "host@x.com",
    name: "Carlos",
    is_host: true,
    permissions: ["bookings:manage", "listings:create"],
    roles: ["guest", "host"],
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    listing_id: "L1",
    guest_id: "u1",
    // Far future so `canCancel` allows and the refund window is open by default.
    start_date: "2027-01-01T00:00:00.000Z",
    end_date: "2027-01-05T00:00:00.000Z",
    status: "accepted",
    status_reason: null,
    total_price: "500.00",
    created_at: "2026-07-01T00:00:00.000Z",
    guests: 2,
    refund_amount: "0.00",
    cancelled_by: null,
    cancelled_at: null,
    ...overrides,
  };
}

function listingDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "L1",
    host_id: "h1",
    title: "Loft Centro",
    location: { address: "Av 1", city: "BA", country: "AR" },
    ...overrides,
  } as unknown as Ret<typeof listingsRepo.findListingById>;
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "h1",
    email: "host@x.com",
    name: "Carlos",
    is_host: true,
    created_at: "",
    password_hash: "",
    ...overrides,
  } as unknown as Ret<typeof usersRepo.findUserById>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorize).mockResolvedValue({ ok: true, data: guestUser() });
  vi.mocked(bookingsRepo.findBookingsByGuestId).mockResolvedValue([]);
  vi.mocked(bookingsRepo.createBookingRecord).mockResolvedValue({
    id: "b1",
    created_at: "2026-07-01T00:00:00.000Z",
  });
  vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking());
  vi.mocked(bookingsRepo.updateBooking).mockResolvedValue(true);
  vi.mocked(listingsRepo.findListingById).mockResolvedValue(listingDoc());
  vi.mocked(usersRepo.findUserById).mockResolvedValue(userRow());
});

describe("getUserBookings", () => {
  it("returns the auth failure without hitting the repo", async () => {
    vi.mocked(authorize).mockResolvedValue({ ok: false, error: "Unauthenticated", code: "UNAUTHORIZED" });
    const res = await getUserBookings();
    expect(res).toEqual({ ok: false, error: "Unauthenticated", code: "UNAUTHORIZED" });
    expect(bookingsRepo.findBookingsByGuestId).not.toHaveBeenCalled();
  });

  it("returns the caller's bookings, scoped to the authenticated user", async () => {
    const rows = [makeBooking()];
    vi.mocked(bookingsRepo.findBookingsByGuestId).mockResolvedValue(rows);
    const res = await getUserBookings();
    expect(res).toEqual({ ok: true, data: rows });
    // Contract: you get *your* bookings — the id comes from auth, not the caller.
    expect(bookingsRepo.findBookingsByGuestId).toHaveBeenCalledWith("u1");
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(bookingsRepo.findBookingsByGuestId).mockRejectedValue(new Error("connection reset"));
    const res = await getUserBookings();
    expect(res).toEqual({ ok: false, error: "Could not retrieve your bookings", code: "UNEXPECTED" });
  });
});

describe("createBooking", () => {
  const params = {
    listingId: "L1",
    checkIn: new Date("2026-08-01T00:00:00.000Z"),
    checkOut: new Date("2026-08-05T00:00:00.000Z"),
    guests: 2,
    totalPrice: 500,
  };

  it("stops at the auth gate", async () => {
    vi.mocked(authorize).mockResolvedValue({ ok: false, error: "Forbidden", code: "FORBIDDEN" });
    const res = await createBooking(params);
    expect(res).toEqual({ ok: false, error: "Forbidden", code: "FORBIDDEN" });
    expect(bookingsRepo.createBookingRecord).not.toHaveBeenCalled();
  });

  it("injects the authed guest and normalizes the dates to ISO", async () => {
    const res = await createBooking(params);
    expect(res.ok).toBe(true);
    // Contract: the guest is taken from auth (not the params), and the Date
    // inputs are persisted as ISO strings.
    expect(bookingsRepo.createBookingRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        guestId: "u1",
        checkIn: "2026-08-01T00:00:00.000Z",
        checkOut: "2026-08-05T00:00:00.000Z",
      }),
    );
  });

  it("turns the overlap exclusion (23P01) into a friendly CONFLICT", async () => {
    vi.mocked(bookingsRepo.createBookingRecord).mockRejectedValue(
      Object.assign(new Error("conflicting key value violates exclusion constraint"), {
        code: "23P01",
      }),
    );
    const res = await createBooking(params);
    expect(res).toEqual({
      ok: false,
      error: "These dates are no longer available. Please select different dates.",
      code: "CONFLICT",
    });
  });

  it("reports UNEXPECTED when the insert returns no row", async () => {
    vi.mocked(bookingsRepo.createBookingRecord).mockResolvedValue(null);
    const res = await createBooking(params);
    expect(res).toEqual({ ok: false, error: "Could not create the booking", code: "UNEXPECTED" });
  });
});

describe("cancelBooking", () => {
  it("refuses when the caller has no standing over the booking", async () => {
    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking({ guest_id: "someone-else" }));
    const res = await cancelBooking("b1");
    expect(res).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(bookingsRepo.updateBooking).not.toHaveBeenCalled();
  });

  it("blocks a cancellation the policy rejects, without writing", async () => {
    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking({ status: "cancelled" }));
    const res = await cancelBooking("b1");
    expect(res).toEqual({
      ok: false,
      error: "This booking is already cancelled",
      code: "VALIDATION",
    });
    expect(bookingsRepo.updateBooking).not.toHaveBeenCalled();
  });

  it("writes the cancellation with the refund the policy decided", async () => {
    const res = await cancelBooking("b1");
    expect(res).toEqual({ ok: true, data: { id: "b1", refundAmount: 500 } });
    // Contract: the persisted refund is what the policy returned, stamped by the actor.
    expect(bookingsRepo.updateBooking).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({
        status: "cancelled",
        cancelled_by: "guest",
        refund_amount: "500.00",
      }),
    );
  });
});

describe("acceptBooking", () => {
  beforeEach(() => {
    vi.mocked(authorize).mockResolvedValue({ ok: true, data: hostUser() });
  });

  it("forbids a host who does not own the listing", async () => {
    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking({ status: "pending" }));
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(listingDoc({ host_id: "other" }));
    const res = await acceptBooking("b1");
    expect(res).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(bookingsRepo.updateBooking).not.toHaveBeenCalled();
  });

  it("rejects a booking that is not pending", async () => {
    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking({ status: "accepted" }));
    const res = await acceptBooking("b1");
    expect(res).toEqual({ ok: false, error: "This booking is already accepted", code: "VALIDATION" });
    expect(bookingsRepo.updateBooking).not.toHaveBeenCalled();
  });

  it("accepts a pending booking", async () => {
    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking({ status: "pending" }));
    const res = await acceptBooking("b1");
    expect(res.ok).toBe(true);
    // Contract: the observable effect is that the booking becomes `accepted`.
    expect(bookingsRepo.updateBooking).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "accepted" }),
    );
  });
});

describe("rejectBooking", () => {
  beforeEach(() => {
    vi.mocked(authorize).mockResolvedValue({ ok: true, data: hostUser() });
  });

  it("steers an already-accepted booking to cancellation instead", async () => {
    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking({ status: "accepted" }));
    const res = await rejectBooking("b1");
    expect(res).toEqual({
      ok: false,
      error:
        "This booking was already accepted. Cancel it instead — the guest will be refunded in full.",
      code: "VALIDATION",
    });
    expect(bookingsRepo.updateBooking).not.toHaveBeenCalled();
  });

  it("rejects a pending booking", async () => {
    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking({ status: "pending" }));
    const res = await rejectBooking("b1");
    expect(res.ok).toBe(true);
    expect(bookingsRepo.updateBooking).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ status: "rejected" }),
    );
  });
});
