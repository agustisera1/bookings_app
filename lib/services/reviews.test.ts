import { beforeEach, describe, expect, it, vi } from "vitest";

// Same seams as bookings.test.ts: identity and data access mocked at the module
// border, the pure rules (../bookings/policy) and pgErrorToCode left real.
vi.mock("../authorize", () => ({ authorize: vi.fn() }));
vi.mock("../repositories/reviews.pg", () => ({
  createReviewRecord: vi.fn(),
  findReviewsByListingId: vi.fn(),
  addReply: vi.fn(),
}));
vi.mock("../repositories/bookings.pg", () => ({ getBookingById: vi.fn() }));
vi.mock("../repositories/listings.mongo", () => ({ findListingById: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { authorize } from "../authorize";
import * as bookingsRepo from "../repositories/bookings.pg";
import * as reviewsRepo from "../repositories/reviews.pg";
import type { Booking } from "../types/booking";
import type { CurrentUser } from "../types/user";
import { createReview } from "./reviews";

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

const input = { bookingId: "b1", rating: 5, comment: "Great stay" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorize).mockResolvedValue({ ok: true, data: guestUser() });
  vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(makeBooking());
  vi.mocked(reviewsRepo.createReviewRecord).mockResolvedValue({ id: "r1" });
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
    expect(reviewsRepo.createReviewRecord).not.toHaveBeenCalled();
  });

  it("refuses a booking that isn't the caller's, same as a missing one", async () => {
    const notFound = { ok: false, error: "Booking not found", code: "NOT_FOUND" };

    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(
      makeBooking({ guest_id: "someone-else" }),
    );
    expect(await createReview(input)).toEqual(notFound);

    vi.mocked(bookingsRepo.getBookingById).mockResolvedValue(null);
    expect(await createReview(input)).toEqual(notFound);

    expect(reviewsRepo.createReviewRecord).not.toHaveBeenCalled();
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
    expect(reviewsRepo.createReviewRecord).not.toHaveBeenCalled();
  });

  it("writes the review against the booking's listing, not a caller-supplied one", async () => {
    const res = await createReview(input);
    expect(res).toEqual({ ok: true, data: { id: "r1" } });
    expect(reviewsRepo.createReviewRecord).toHaveBeenCalledWith({
      rating: 5,
      comment: "Great stay",
      // Read off the booking row, and the author off the session.
      listingId: "L1",
      authorName: "Jane",
    });
  });

  it("maps an unexpected repo failure to a generic message", async () => {
    vi.mocked(reviewsRepo.createReviewRecord).mockRejectedValue(
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
