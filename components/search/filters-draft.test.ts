import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMIT,
  EMPTY_DRAFT,
  PRICE_MAX,
  PRICE_MIN,
  countActiveFilters,
  draftReducer,
  type Draft,
} from "./filters-draft";

describe("draftReducer", () => {
  it("toggles an amenity on and off", () => {
    const added = draftReducer(EMPTY_DRAFT, {
      type: "toggleAmenity",
      amenity: "wifi",
    });
    expect(added.amenities).toEqual(["wifi"]);

    const removed = draftReducer(added, {
      type: "toggleAmenity",
      amenity: "wifi",
    });
    expect(removed.amenities).toEqual([]);
  });

  it("merges a patch via 'set'", () => {
    expect(draftReducer(EMPTY_DRAFT, { type: "set", patch: { rating: 4 } }).rating).toBe(4);
  });

  describe("selectFrom — a start on/after the current end invalidates the end", () => {
    const until = new Date(2026, 7, 5);

    it("clears the end when the new start is later", () => {
      const state: Draft = { ...EMPTY_DRAFT, availableUntil: until };
      const next = draftReducer(state, { type: "selectFrom", date: new Date(2026, 7, 10) });
      expect(next.availableUntil).toBeUndefined();
    });

    it("clears the end when the new start equals it (the `<=` boundary)", () => {
      const state: Draft = { ...EMPTY_DRAFT, availableUntil: until };
      const next = draftReducer(state, { type: "selectFrom", date: new Date(2026, 7, 5) });
      expect(next.availableUntil).toBeUndefined();
    });

    it("keeps the end when the new start is earlier", () => {
      const state: Draft = { ...EMPTY_DRAFT, availableUntil: until };
      const next = draftReducer(state, { type: "selectFrom", date: new Date(2026, 7, 1) });
      expect(next.availableUntil).toBe(until);
    });
  });

  it("clears both dates on 'clearDates'", () => {
    const state: Draft = {
      ...EMPTY_DRAFT,
      availableFrom: new Date(2026, 7, 1),
      availableUntil: new Date(2026, 7, 5),
    };
    const next = draftReducer(state, { type: "clearDates" });
    expect(next.availableFrom).toBeUndefined();
    expect(next.availableUntil).toBeUndefined();
  });

  it("resets to an empty draft on 'clearAll'", () => {
    const dirty: Draft = { ...EMPTY_DRAFT, rating: 5, amenities: ["wifi"] };
    expect(countActiveFilters(draftReducer(dirty, { type: "clearAll" }))).toBe(0);
  });
});

describe("countActiveFilters", () => {
  it("is zero for the empty draft", () => {
    expect(countActiveFilters(EMPTY_DRAFT)).toBe(0);
  });

  it("counts a set property type, rating, price range and amenities", () => {
    expect(countActiveFilters({ ...EMPTY_DRAFT, propertyType: "house" })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_DRAFT, rating: 4 })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_DRAFT, priceRange: [100, PRICE_MAX] })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_DRAFT, amenities: ["wifi"] })).toBe(1);
  });

  it("counts a date range only when both ends are set", () => {
    expect(countActiveFilters({ ...EMPTY_DRAFT, availableFrom: new Date(2026, 7, 1) })).toBe(0);
    expect(
      countActiveFilters({
        ...EMPTY_DRAFT,
        availableFrom: new Date(2026, 7, 1),
        availableUntil: new Date(2026, 7, 5),
      }),
    ).toBe(1);
  });

  it("does not count defaults (type, limit, full price range)", () => {
    expect(
      countActiveFilters({
        ...EMPTY_DRAFT,
        limit: DEFAULT_LIMIT,
        priceRange: [PRICE_MIN, PRICE_MAX],
      }),
    ).toBe(0);
  });
});
