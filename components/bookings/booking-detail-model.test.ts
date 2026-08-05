import { describe, expect, it } from "vitest";
import {
  describeStatus,
  priceBreakdown,
  refundDeadline,
  stayStage,
} from "./booking-detail-model";
import type { BookingRow } from "./bookings-model";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const START = Date.UTC(2026, 7, 10);
const END = Date.UTC(2026, 7, 15);

function booking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: "b1",
    status: "accepted",
    start_date: String(START),
    end_date: String(END),
    total_price: 500,
    ...overrides,
  } as unknown as BookingRow;
}

describe("stayStage — boundaries of the stay window", () => {
  it("is upcoming right up to the instant before check-in", () => {
    expect(stayStage(booking(), START - 1)).toBe("upcoming");
  });

  it("flips to in_progress exactly at check-in", () => {
    expect(stayStage(booking(), START)).toBe("in_progress");
  });

  it("is still in_progress on the check-out instant — that night counts as booked", () => {
    expect(stayStage(booking(), END)).toBe("in_progress");
  });

  it("is past one instant after check-out", () => {
    expect(stayStage(booking(), END + 1)).toBe("past");
  });

  it("falls back to upcoming when a date can't be parsed", () => {
    expect(stayStage(booking({ start_date: null }), END + DAY_MS)).toBe(
      "upcoming",
    );
  });
});

describe("priceBreakdown", () => {
  it("derives the nightly rate from the total over the stay's nights", () => {
    expect(priceBreakdown(booking())).toEqual({
      nights: 5,
      nightlyRate: 100,
      total: 500,
    });
  });

  it("drops the nightly rate on a zero-night range instead of dividing by zero", () => {
    const sameDay = booking({ start_date: String(START), end_date: String(START) });
    expect(priceBreakdown(sameDay)).toEqual({
      nights: 0,
      nightlyRate: null,
      total: 500,
    });
  });
});

describe("describeStatus — the stage disambiguates a status that never moved", () => {
  it("reads pending as waiting while the dates are still ahead", () => {
    expect(describeStatus("pending", "upcoming").headline).toBe(
      "Waiting on the host",
    );
  });

  it("reads the same pending as unanswered once the dates passed", () => {
    expect(describeStatus("pending", "past").headline).toBe("Never confirmed");
  });

  it("splits accepted across the three stages", () => {
    expect(describeStatus("accepted", "upcoming").headline).toBe("Confirmed");
    expect(describeStatus("accepted", "in_progress").headline).toBe(
      "Stay in progress",
    );
    expect(describeStatus("accepted", "past").headline).toBe("Completed");
  });
});

describe("refundDeadline", () => {
  it("lands 48 hours before check-in", () => {
    expect(refundDeadline(booking()).getTime()).toBe(START - 48 * HOUR_MS);
  });
});
