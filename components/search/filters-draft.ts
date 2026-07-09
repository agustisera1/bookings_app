import type { PropertyType } from "@/lib/listings";

// Filter model for the search panel: the draft shape, its transitions and the
// derived active-count. Pure (no React) so it stays cohesive and unit-testable,
// and decoupled from the Filters component's rendering/URL wiring.

export const LISTING_TYPES = [
  "accommodation",
  "experience",
  "equipment",
] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const DEFAULT_TYPE = "accommodation";
export const DEFAULT_LIMIT = 12;
export const PRICE_MIN = 0;
export const PRICE_MAX = 1000;

// Everything the user is editing before hitting "Show results".
export type Draft = {
  type: ListingType;
  propertyType: PropertyType | null;
  beds: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  amenities: string[];
  availableFrom: Date | undefined;
  availableUntil: Date | undefined;
  rating: number | null;
  limit: number;
  priceRange: number[];
};

export const EMPTY_DRAFT: Draft = {
  type: DEFAULT_TYPE,
  propertyType: null,
  beds: null,
  bathrooms: null,
  maxGuests: null,
  amenities: [],
  availableFrom: undefined,
  availableUntil: undefined,
  rating: null,
  limit: DEFAULT_LIMIT,
  priceRange: [PRICE_MIN, PRICE_MAX],
};

export type DraftAction =
  | { type: "reseed"; draft: Draft }
  | { type: "set"; patch: Partial<Draft> }
  | { type: "toggleAmenity"; amenity: string }
  | { type: "selectFrom"; date?: Date }
  | { type: "selectUntil"; date?: Date }
  | { type: "clearDates" }
  | { type: "clearAll" };

// All draft transitions live here, so the component only dispatches intent.
export function draftReducer(state: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case "reseed":
      return action.draft;
    case "set":
      return { ...state, ...action.patch };
    case "toggleAmenity":
      return {
        ...state,
        amenities: state.amenities.includes(action.amenity)
          ? state.amenities.filter((a) => a !== action.amenity)
          : [...state.amenities, action.amenity],
      };
    case "selectFrom": {
      // A start on/after the current end invalidates the end.
      const availableUntil =
        action.date &&
        state.availableUntil &&
        state.availableUntil <= action.date
          ? undefined
          : state.availableUntil;
      return { ...state, availableFrom: action.date, availableUntil };
    }
    case "selectUntil":
      return { ...state, availableUntil: action.date };
    case "clearDates":
      return { ...state, availableFrom: undefined, availableUntil: undefined };
    case "clearAll":
      return { ...EMPTY_DRAFT, priceRange: [PRICE_MIN, PRICE_MAX] };
  }
}

// Shared by the trigger badge (applied filters) and the "Clear all" state (draft).
export function countActiveFilters(d: Draft): number {
  return (
    (d.type !== DEFAULT_TYPE ? 1 : 0) +
    (d.propertyType != null ? 1 : 0) +
    (d.beds != null ? 1 : 0) +
    (d.bathrooms != null ? 1 : 0) +
    (d.maxGuests != null ? 1 : 0) +
    (d.amenities.length > 0 ? 1 : 0) +
    (d.availableFrom && d.availableUntil ? 1 : 0) +
    (d.rating != null ? 1 : 0) +
    (d.limit !== DEFAULT_LIMIT ? 1 : 0) +
    (d.priceRange[0] !== PRICE_MIN || d.priceRange[1] !== PRICE_MAX ? 1 : 0)
  );
}
