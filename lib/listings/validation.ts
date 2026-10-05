import { z } from "zod";

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

// Photo upload constraints. Shared on purpose: the picker uses them to reject
// a file before spending an upload on it, and `/api/s3` re-checks them because
// the route is reachable without going through the picker.
export const ACCEPTED_PHOTO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AcceptedPhotoType = (typeof ACCEPTED_PHOTO_TYPES)[number];

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const MAX_PHOTO_MB = MAX_PHOTO_BYTES / 1024 / 1024;

export function isAcceptedPhotoType(type: string): type is AcceptedPhotoType {
  return (ACCEPTED_PHOTO_TYPES as readonly string[]).includes(type);
}

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

export const createListingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string().trim().min(1, "Description is required"),
  price: z.number({ error: "Enter a price" }).positive("Price must be greater than 0"),
  location: z.object({
    address: z.string().trim().min(1, "Address is required"),
    city: z.string().trim().min(1, "City is required"),
    country: z.string().trim().min(1, "Country is required"),
  }),
  attributes: z.object({
    beds: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    max_guests: z.number({ error: "Enter max guests" }).int().min(1, "At least 1 guest"),
    check_in_time: z.string().optional(),
    check_out_time: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    minimum_nights: z.number().int().min(1).optional(),
    property_type: z.enum(PROPERTY_TYPES).optional(),
  }),
});

export const createListingInputSchema = createListingSchema.extend({
  type: z.string().trim().min(1),
});

export type CreateListingInput = z.infer<typeof createListingInputSchema>;

export const listingDetailsSchema = createListingSchema.pick({
  title: true,
  description: true,
  price: true,
  location: true,
});

export const editListingSchema = listingDetailsSchema.partial().extend({
  photos: z.array(z.url()).optional(),
});

export type EditListingInput = z.infer<typeof editListingSchema>;

export const listingIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Listing not found");

export const listingFiltersSchema = z.object({
  own: z.boolean().nullish(),
  limit: z.int().nullish(),
  type: z.string().nullish(),
  term: z.string().nullish(),
  rating: z.number().nullish(),
  // [from, to] as `YYYY-MM-DD`; listings booked in that range are excluded.
  availabilityRange: z.array(z.string().nullish()).nullish(),
  priceRange: z.array(z.number()).nullish(),
  propertyType: z.string().nullish(),
  beds: z.int().nullish(),
  bathrooms: z.int().nullish(),
  maxGuests: z.int().nullish(),
  amenities: z.array(z.string()).nullish(),
});

export type ListingFilters = z.infer<typeof listingFiltersSchema>;

export type ListingFiltersInput = z.input<typeof listingFiltersSchema>;

// Decodes the raw query string into the filter shape. Shared by every listings
// route so the param → filter mapping lives in one place; `own` is set per-route.
export function parseListingFilters(params: ListingSearchParams): ListingFilters {
  return {
    type: params.type,
    term: params.term,
    propertyType: params.propertyType,
    rating: params.rating ? Number(params.rating) : undefined,
    limit: params.limit ? Number(params.limit) : undefined,
    priceRange: params.priceRange ? params.priceRange.split(",").map(Number) : undefined,
    beds: params.beds ? Number(params.beds) : undefined,
    bathrooms: params.bathrooms ? Number(params.bathrooms) : undefined,
    maxGuests: params.maxGuests ? Number(params.maxGuests) : undefined,
    amenities: params.amenities ? params.amenities.split(",") : undefined,
    availabilityRange: params.availabilityRange
      ? params.availabilityRange.split(",")
      : undefined,
  };
}
