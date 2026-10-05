import { describe, expect, it } from "vitest";
import { canCancel } from "@/lib/bookings/policy";
import type { BookingRow } from "./bookings-model";

// A row straight off GraphQL reaches the rules as-is: `DateTime` serializes to ISO,
// which `new Date()` parses the same on the server and in the browser.
describe("booking rows and the cancellation rules", () => {
  const CHECK_IN = Date.UTC(2026, 7, 10);
  const row = {
    status: "accepted",
    start_date: new Date(CHECK_IN).toISOString(),
    total_price: 500,
  } as BookingRow;

  it("refunds in full outside the free-cancellation window", () => {
    const now = new Date(CHECK_IN - 49 * 3_600_000);
    expect(canCancel(row, "guest", now)).toEqual({ allowed: true, refundAmount: 500 });
  });

  it("refuses a stay that already started", () => {
    const now = new Date(CHECK_IN + 1);
    expect(canCancel(row, "guest", now).allowed).toBe(false);
  });
});
