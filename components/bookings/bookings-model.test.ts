import { describe, expect, it } from "vitest";
import { canCancel } from "@/lib/bookings/policy";
import { toCancellableRow, type BookingRow } from "./bookings-model";

describe("toCancellableRow", () => {
  const CHECK_IN = Date.UTC(2026, 7, 10);
  const row = {
    status: "accepted",
    start_date: String(CHECK_IN), // as GraphQL serializes a PG Date: epoch millis
    total_price: 500,
  } as unknown as BookingRow;

  // Handing the raw wire string to the rules yields `Invalid Date`, which loses
  // every comparison silently: no refund, and a started stay still looks
  // cancellable. Normalizing is what keeps the rules answerable.
  it("hands the rules a date they can actually parse", () => {
    expect(new Date(toCancellableRow(row).startDate).getTime()).toBe(CHECK_IN);
  });

  it("refunds in full outside the free-cancellation window", () => {
    const now = new Date(CHECK_IN - 49 * 3_600_000);
    expect(canCancel(toCancellableRow(row), "guest", now)).toEqual({
      allowed: true,
      refundAmount: 500,
    });
  });

  it("refuses a stay that already started", () => {
    const now = new Date(CHECK_IN + 1);
    expect(canCancel(toCancellableRow(row), "guest", now).allowed).toBe(false);
  });
});
