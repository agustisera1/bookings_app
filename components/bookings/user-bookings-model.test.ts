import { describe, expect, it } from "vitest";
import { partitionBookings, type BookingRow } from "./user-bookings-model";

function booking(id: string, start: number, end: number): BookingRow {
  return { id, start_date: String(start), end_date: String(end) } as unknown as BookingRow;
}

describe("partitionBookings", () => {
  const now = Date.UTC(2026, 7, 15);

  const edge = booking("edge", Date.UTC(2026, 7, 1), now); // ends exactly now
  const up2 = booking("up2", Date.UTC(2026, 7, 10), Date.UTC(2026, 7, 25));
  const up1 = booking("up1", Date.UTC(2026, 7, 18), Date.UTC(2026, 7, 20));
  const past1 = booking("past1", Date.UTC(2026, 7, 5), Date.UTC(2026, 7, 10));
  const past2 = booking("past2", Date.UTC(2026, 6, 30), Date.UTC(2026, 7, 1));

  const { upcoming, past } = partitionBookings([up1, past2, edge, past1, up2], now);

  it("puts anything ending now-or-later in upcoming, soonest start first", () => {
    expect(upcoming.map((b) => b.id)).toEqual(["edge", "up2", "up1"]);
  });

  it("puts anything already ended in past, most recent end first", () => {
    expect(past.map((b) => b.id)).toEqual(["past1", "past2"]);
  });
});
