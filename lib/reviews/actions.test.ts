import { beforeEach, describe, expect, it, vi } from "vitest";

// Identity and data access mocked at the module border; the pure rules
// (bookings/policy) and the zod schemas left real.
vi.mock("@/lib/authorize", () => ({ authorize: vi.fn() }));
vi.mock("./repository", () => ({
  insertReview: vi.fn(),
  findReviewsByListingId: vi.fn(),
  setHostReply: vi.fn(),
}));
vi.mock("@/lib/repositories/bookings.pg", () => ({ getBookingById: vi.fn() }));
vi.mock("@/lib/repositories/listings.mongo", () => ({ findListingById: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { authorize } from "@/lib/authorize";
import * as bookingsRepo from "@/lib/repositories/bookings.pg";
import type { Booking } from "@/lib/types/booking";
import type { CurrentUser } from "@/lib/types/user";
import { createReview } from "./actions";
import * as reviewsRepo from "./repository";

const FINISHED = "2026-07-01T00:00:00.000Z";
const NOT_FINISHED = "2099-01-01T00:00:00.000Z";

function guestUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u1",
    email: "guest@x.com",
    name: "Jane",
    is_host: false,
    permissions: ["reviews:create"],
    roles: ["guest"],
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    listing_id: "L1",
    guest_id: "u1",
    start_date: "2026-06-28T00:00:00.000Z",
    end_date: FINISHED,
    status: "accepted",
    status_reason: null,
    total_price: "500.00",
    created_at: "2026-06-01T00:00:00.000Z",
    guests: 2,
    refund_amount: "0.00",
    cancelled_by: null,
    cancelled_at: null,
    ...overrides,
  };
}

const BOOKING_ID = "8f3c2a1e-4b5d-4c6e-9f7a-1b2c3d4e5f60";
const input = { bookingId: BOOKING_ID, rating: 5, comment: "Great stay" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorize).mockResolvedValue({ ok: true, data: guestUser() });
  vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking());
  vi.mocked(reviewsRepo.insertReview).mockResolvedValue({ id: "r1" });
});

describe("createReview", () => {
  it("returns the auth failure without touching the repos", async () => {
    vi.mocked(authorize).mockResolvedValue({
      ok: false,
      error: "Forbidden",
      code: "FORBIDDEN",
    });
    const res = await createReview(input);
    expect(res).toEqual({ ok: false, error: "Forbidden", code: "FORBIDDEN" });
    expect(reviewsRepo.insertReview).not.toHaveBeenCalled();
  });

  it("refuses a booking that isn't the caller's, same as a missing one", async () => {
    const notFound = { ok: false, error: "Booking not found", code: "NOT_FOUND" };

    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(
      makeBooking({ guest_id: "someone-else" }),
    );
    expect(await createReview(input)).toEqual(notFound);

    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(null);
    expect(await createReview(input)).toEqual(notFound);

    expect(reviewsRepo.insertReview).not.toHaveBeenCalled();
  });

  // The gate the old "has *a* booking" check never actually enforced.
  it("refuses a stay that hasn't finished, whatever its status", async () => {
    for (const booking of [
      makeBooking({ end_date: NOT_FINISHED }),
      makeBooking({ status: "rejected" }),
      makeBooking({ status: "cancelled" }),
      makeBooking({ status: "pending" }),
    ]) {
      vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(booking);
      const res = await createReview(input);
      expect(res).toEqual({
        ok: false,
        error: "You can only review a stay once it's finished",
        code: "FORBIDDEN",
      });
    }
    expect(reviewsRepo.insertReview).not.toHaveBeenCalled();
  });

  it("writes the review against the booking's listing, not a caller-supplied one", async () => {
    const res = await createReview(input);
    expect(res).toEqual({ ok: true, data: { id: "r1" } });
    expect(reviewsRepo.insertReview).toHaveBeenCalledWith({
      rating: 5,
      comment: "Great stay",
      // Read off the booking row, and the author off the session.
      listing_id: "L1",
      author_name: "Jane",
    });
  });

  it("rejects invalid input before touching the repos", async () => {
    const res = await createReview({ ...input, rating: 6 });
    expect(res).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(bookingsRepo.getBookingById).not.toHaveBeenCalled();
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(reviewsRepo.insertReview).mockRejectedValue(
      new Error("connection reset"),
    );
    const res = await createReview(input);
    expect(res).toEqual({
      ok: false,
      error: "Could not create the review",
      code: "UNEXPECTED",
    });
  });
});
