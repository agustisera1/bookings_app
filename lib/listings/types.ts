type ListingAttributes = {
  beds: number;
  bathrooms: number;
  max_guests: number;
  check_in_time: string;
  check_out_time: string;
  amenities: string[];
  minimum_nights: number;
  property_type: string;
};

type ListingLocation = {
  type?: string;
  coordinates?: [number, number];
  city: string;
  country: string;
  address: string;
};

export type ListingDocumentValues = {
  type: string;
  host_id: string;
  title: string;
  description: string;
  price: number;
  location: ListingLocation;
  attributes?: Partial<ListingAttributes>;
  photos: string[];
  rating_avg?: number;
};

export type Listing = ListingDocumentValues & { _id: string };

export type EditListingDocumentValues = Omit<ListingDocumentValues, "rating_avg" | "host_id">;
