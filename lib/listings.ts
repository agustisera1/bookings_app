import type { GetListingFilters } from "./types/listing";

// Canonical listing vocabulary. These are the exact values stored in Mongo
// (see scripts/seed_listings.js), so the create form and the search filters
// must both draw from here to stay in sync — otherwise a host could pick a
// value that no filter can ever match.

export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "cabin",
  "loft",
  "villa",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const AMENITIES = [
  "wifi",
  "aire_acondicionado",
  "calefaccion",
  "cocina",
  "lavarropas",
  "estacionamiento",
  "piscina",
  "parrilla",
  "jacuzzi",
  "gimnasio",
  "tv_smart",
  "balcon",
  "terraza",
  "jardín",
  "mascotas_permitidas",
] as const;

// Raw URL search params written by the search/Filters panel. Everything is a
// string (or absent) because it comes off the query string; parsing lives in
// `parseListingFilters` so every route consuming these decodes them the same way.
export type ListingSearchParams = {
  limit?: string;
  type?: string;
  term?: string;
  location?: string;
  rating?: string;
  availabilityRange?: string;
  priceRange?: string;
  propertyType?: string;
  beds?: string;
  bathrooms?: string;
  maxGuests?: string;
  amenities?: string;
};

// Decode the raw query string into the domain filter shape the GraphQL query
// expects. Shared by every listings route (explore, my listings) so the
// param → filter mapping stays in one place. `own` is added per-route.
export function parseListingFilters(
  params: ListingSearchParams,
): GetListingFilters {
  return {
    type: params.type,
    term: params.term,
    propertyType: params.propertyType,
    rating: params.rating ? Number(params.rating) : undefined,
    limit: params.limit ? Number(params.limit) : undefined,
    priceRange: params.priceRange
      ? params.priceRange.split(",").map(Number)
      : undefined,
    beds: params.beds ? Number(params.beds) : undefined,
    bathrooms: params.bathrooms ? Number(params.bathrooms) : undefined,
    maxGuests: params.maxGuests ? Number(params.maxGuests) : undefined,
    amenities: params.amenities ? params.amenities.split(",") : undefined,
    availabilityRange: params.availabilityRange
      ? params.availabilityRange.split(",")
      : undefined,
  };
}
