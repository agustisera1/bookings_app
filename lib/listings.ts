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
