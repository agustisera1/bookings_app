import { describe, expect, it } from "vitest";
import {
  canCancel,
  refundFor,
  FREE_CANCELLATION_WINDOW_HOURS,
  type CancellableBooking,
} from "./policy";

const HOUR_MS = 60 * 60 * 1000;
const CHECK_IN = "2026-08-01T00:00:00.000Z";

// The instant the guest forfeit window opens: exactly 48h before check-in.
const FREE_UNTIL = new Date(
  new Date(CHECK_IN).getTime() - FREE_CANCELLATION_WINDOW_HOURS * HOUR_MS,
);

// A time well before anything, to prove short-circuits don't depend on `now`.
const ANY_TIME = new Date("2026-01-01T00:00:00.000Z");

function booking(
  overrides: Partial<CancellableBooking> = {},
): CancellableBooking {
  return { status: "accepted", startDate: CHECK_IN, totalPrice: 500, ...overrides };
}

describe("refundFor — 48h free-cancellation window (guest, accepted)", () => {
  it("refunds in full one millisecond before the window opens", () => {
    expect(refundFor(booking(), "guest", new Date(FREE_UNTIL.getTime() - 1))).toBe(500);
  });

  it("refunds nothing exactly at the 48h boundary", () => {
    // `now < freeUntil` is strict: at equality the window is already closed.
    expect(refundFor(booking(), "guest", FREE_UNTIL)).toBe(0);
  });

  it("refunds nothing one millisecond after the window opens", () => {
    expect(refundFor(booking(), "guest", new Date(FREE_UNTIL.getTime() + 1))).toBe(0);
  });
});

describe("canCancel — check-in boundary", () => {
  it("allows cancelling one hour before check-in", () => {
    const now = new Date(new Date(CHECK_IN).getTime() - HOUR_MS);
    expect(canCancel(booking(), "guest", now).allowed).toBe(true);
  });

  it("rejects cancelling exactly at check-in", () => {
    // `hasStarted` uses `<=`: at `now === start_date` the stay has begun.
    expect(canCancel(booking(), "guest", new Date(CHECK_IN))).toEqual({
      allowed: false,
      reason: expect.stringContaining("already started"),
    });
  });
});

describe("canCancel — host cancelling an accepted booking", () => {
  it("refunds in full even one hour before check-in", () => {
    const now = new Date(new Date(CHECK_IN).getTime() - HOUR_MS);
    expect(canCancel(booking(), "host", now)).toEqual({
      allowed: true,
      refundAmount: 500,
    });
  });
});

describe("canCancel — guest cancelling a pending booking", () => {
  it("refunds in full even two hours before check-in", () => {
    const now = new Date(new Date(CHECK_IN).getTime() - 2 * HOUR_MS);
    expect(canCancel(booking({ status: "pending" }), "guest", now)).toEqual({
      allowed: true,
      refundAmount: 500,
    });
  });
});

describe("canCancel — terminal statuses always reject", () => {
  it("rejects a cancelled booking", () => {
    expect(canCancel(booking({ status: "cancelled" }), "guest", ANY_TIME)).toEqual({
      allowed: false,
      reason: expect.stringContaining("already cancelled"),
    });
  });

  it("rejects a rejected booking", () => {
    expect(canCancel(booking({ status: "rejected" }), "host", ANY_TIME)).toEqual({
      allowed: false,
      reason: expect.stringContaining("rejected"),
    });
  });
});

describe("canCancel — host on a pending request", () => {
  it("rejects and points to rejecting the request instead", () => {
    expect(canCancel(booking({ status: "pending" }), "host", ANY_TIME)).toEqual({
      allowed: false,
      reason: expect.stringContaining("Reject this request"),
    });
  });
});
