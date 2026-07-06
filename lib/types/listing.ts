type Attributes = Partial<ListingAttributes>;
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

export type EditListingDocumentValues = Omit<
  ListingDocumentValues,
  "rating_avg" | "host_id"
>;

export type ListingDocumentValues = {
  type: string;
  host_id: string;
  title: string;
  description: string;
  price: number;
  location: ListingLocation;
  attributes?: Attributes;
  photos: string[];
  rating_avg?: number;
};

// Plain shape the create-listing form submits. Services receive this
// instead of importing the component's form-values type directly.
export type CreateListingInput = {
  type: string;
  title: string;
  description: string;
  price: number;
  location: ListingLocation;
  attributes: Attributes & { max_guests: number };
};
