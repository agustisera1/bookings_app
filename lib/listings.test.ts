import { describe, expect, it } from "vitest";
import { parseListingFilters } from "./listings";

describe("parseListingFilters", () => {
  it("leaves every field undefined when nothing is in the query string", () => {
    expect(parseListingFilters({})).toEqual({
      type: undefined,
      term: undefined,
      propertyType: undefined,
      rating: undefined,
      limit: undefined,
      priceRange: undefined,
      beds: undefined,
      bathrooms: undefined,
      maxGuests: undefined,
      amenities: undefined,
      availabilityRange: undefined,
    });
  });

  it("passes strings through and decodes numbers, lists and ranges", () => {
    expect(
      parseListingFilters({
        type: "accommodation",
        term: "beach",
        propertyType: "house",
        rating: "4",
        limit: "12",
        priceRange: "100,500",
        beds: "2",
        bathrooms: "1",
        maxGuests: "5",
        amenities: "wifi,piscina",
        availabilityRange: "2026-08-01,2026-08-05",
      }),
    ).toEqual({
      type: "accommodation",
      term: "beach",
      propertyType: "house",
      rating: 4,
      limit: 12,
      priceRange: [100, 500],
      beds: 2,
      bathrooms: 1,
      maxGuests: 5,
      amenities: ["wifi", "piscina"],
      availabilityRange: ["2026-08-01", "2026-08-05"],
    });
  });

  it("splits a single-value range into a one-element array", () => {
    expect(parseListingFilters({ priceRange: "100" }).priceRange).toEqual([100]);
  });
});
