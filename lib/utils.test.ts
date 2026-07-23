import { describe, expect, it } from "vitest";
import {
  bookingStatusVariant,
  cn,
  formatPrice,
  humanize,
  listingTypeGradient,
} from "./utils";

describe("formatPrice", () => {
  it("returns an em dash for nullish amounts", () => {
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice(undefined)).toBe("—");
  });

  it("formats a number as USD currency", () => {
    expect(formatPrice(1234.5)).toContain("1,234.50");
    expect(formatPrice(1234.5).startsWith("$")).toBe(true);
    expect(formatPrice(0)).toBe("$0.00");
  });
});

describe("humanize", () => {
  it("turns a snake_case slug into a Title Case label", () => {
    expect(humanize("aire_acondicionado")).toBe("Aire Acondicionado");
    expect(humanize("wifi")).toBe("Wifi");
  });
});

describe("listingTypeGradient", () => {
  it("maps a known type to its gradient", () => {
    expect(listingTypeGradient("accommodation")).toBe("from-violet-500 to-indigo-600");
  });

  it("falls back to slate for unknown or missing types", () => {
    expect(listingTypeGradient("unknown")).toBe("from-slate-400 to-slate-600");
    expect(listingTypeGradient(null)).toBe("from-slate-400 to-slate-600");
  });
});

describe("bookingStatusVariant", () => {
  it("maps each status to its badge variant", () => {
    expect(bookingStatusVariant).toEqual({
      accepted: "primary",
      pending: "secondary",
      cancelled: "destructive",
      rejected: "destructive",
    });
  });
});

describe("cn", () => {
  it("merges conflicting tailwind classes, keeping the last", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
