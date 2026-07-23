import { describe, expect, it } from "vitest";
import {
  calcNights,
  formatDate,
  formatDayLabel,
  formatTime,
  fromISODate,
  getAvailabilityFromBookings,
  parsePgTimestamp,
  parseTs,
  toDayKey,
  toISODate,
  toMillis,
} from "./dates";

describe("parseTs — epoch-millis strings only", () => {
  it("returns null for empty, nullish or non-numeric input", () => {
    expect(parseTs(null)).toBeNull();
    expect(parseTs(undefined)).toBeNull();
    expect(parseTs("")).toBeNull();
    expect(parseTs("abc")).toBeNull();
  });

  it("parses an epoch-millis string into that instant", () => {
    expect(parseTs("1000")?.getTime()).toBe(1000);
  });
});

describe("calcNights", () => {
  it("counts whole days between two dates", () => {
    const from = new Date(Date.UTC(2026, 7, 1));
    const to = new Date(Date.UTC(2026, 7, 4));
    expect(calcNights(from, to)).toBe(3);
  });

  it("is zero for the same day and for any unparseable input", () => {
    const day = new Date(Date.UTC(2026, 7, 1));
    expect(calcNights(day, day)).toBe(0);
    expect(calcNights(null, day)).toBe(0);
  });
});

describe("parsePgTimestamp", () => {
  it("returns null for nullish input and invalid dates", () => {
    expect(parsePgTimestamp(null)).toBeNull();
    expect(parsePgTimestamp("")).toBeNull();
    expect(parsePgTimestamp(new Date("not a date"))).toBeNull();
  });

  it("returns a passed-in valid Date as-is", () => {
    const d = new Date();
    expect(parsePgTimestamp(d)).toBe(d);
  });

  it("normalizes a minute-less offset (`-03` → `-03:00`)", () => {
    expect(parsePgTimestamp("2026-07-29 00:00:00-03")?.getTime()).toBe(
      new Date("2026-07-29T00:00:00-03:00").getTime(),
    );
  });

  it("keeps an offset that already carries minutes", () => {
    expect(parsePgTimestamp("2026-07-29 12:00:00+05:30")?.getTime()).toBe(
      new Date("2026-07-29T12:00:00+05:30").getTime(),
    );
  });
});

describe("getAvailabilityFromBookings", () => {
  it("maps each booking to an inclusive from/to range (end date stays blocked)", () => {
    const ranges = getAvailabilityFromBookings([
      { start_date: "2026-08-01 00:00:00+00", end_date: "2026-08-05 00:00:00+00" },
    ]);

    expect(ranges).toHaveLength(1);
    expect((ranges[0] as { from: Date }).from.getTime()).toBe(
      new Date("2026-08-01T00:00:00+00:00").getTime(),
    );
    expect((ranges[0] as { to: Date }).to.getTime()).toBe(
      new Date("2026-08-05T00:00:00+00:00").getTime(),
    );
  });
});

describe("toISODate / fromISODate", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(toISODate(new Date(2026, 7, 1))).toBe("2026-08-01");
  });

  it("round-trips through fromISODate without a timezone shift", () => {
    expect(toISODate(fromISODate("2026-08-01"))).toBe("2026-08-01");
  });
});

describe("formatDayLabel", () => {
  const now = new Date(2026, 6, 22, 15, 0);

  it("labels the same day 'Today' (including future timestamps)", () => {
    expect(formatDayLabel(new Date(2026, 6, 22, 9, 0), now)).toBe("Today");
    expect(formatDayLabel(new Date(2026, 6, 23, 9, 0), now)).toBe("Today");
  });

  it("labels the previous day 'Yesterday'", () => {
    expect(formatDayLabel(new Date(2026, 6, 21, 9, 0), now)).toBe("Yesterday");
  });

  it("uses the weekday name within the last week", () => {
    const threeDaysAgo = new Date(2026, 6, 19, 9, 0);
    expect(formatDayLabel(threeDaysAgo, now)).toBe(
      threeDaysAgo.toLocaleDateString("en-US", { weekday: "long" }),
    );
  });

  it("falls back to an absolute date beyond a week", () => {
    const old = new Date(2026, 6, 1, 9, 0);
    expect(formatDayLabel(old, now)).toBe(formatDate(old));
  });
});

describe("toMillis / toDayKey", () => {
  it("toMillis reads epoch strings, Dates and ISO strings; 0 when unparseable", () => {
    expect(toMillis(null)).toBe(0);
    expect(toMillis(new Date(5))).toBe(5);
    expect(toMillis("1000")).toBe(1000);
    expect(toMillis("2026-08-01T00:00:00.000Z")).toBe(
      new Date("2026-08-01T00:00:00.000Z").getTime(),
    );
  });

  it("toDayKey buckets by calendar day; empty string when unparseable", () => {
    expect(toDayKey(new Date(2026, 7, 1, 13, 30))).toBe("2026-08-01");
    expect(toDayKey(null)).toBe("");
  });
});

describe("formatDate / formatTime", () => {
  it("formats a date as 'Mon D, YYYY'", () => {
    expect(formatDate(new Date(2026, 7, 1))).toBe("Aug 1, 2026");
  });

  it("returns an em dash for an unparseable date", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formats a time as 'H:MM AM/PM'", () => {
    expect(formatTime(new Date(2026, 7, 1, 9, 5))).toBe("9:05 AM");
  });

  it("returns an empty string for an unparseable time", () => {
    expect(formatTime(null)).toBe("");
  });
});
