/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type FiltersInput = {
  amenities?: Array<string> | null | undefined;
  availabilityRange?: Array<string | null | undefined> | null | undefined;
  bathrooms?: number | null | undefined;
  beds?: number | null | undefined;
  limit?: number | null | undefined;
  location?: LocationInput | null | undefined;
  maxGuests?: number | null | undefined;
  own?: boolean | null | undefined;
  priceRange?: Array<number> | null | undefined;
  propertyType?: string | null | undefined;
  rating?: number | null | undefined;
  term?: string | null | undefined;
  type?: string | null | undefined;
};

export type LocationInput = {
  address?: string | null | undefined;
  city?: string | null | undefined;
  coordinates?: Array<number | null | undefined> | null | undefined;
  country?: string | null | undefined;
  type?: string | null | undefined;
};

export type GetUserBookingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserBookingsQuery = { guestBookings: Array<{ type: string | null, title: string | null, photos: Array<string | null> | null, created_at: string | null, start_date: string | null, end_date: string | null, status: string | null, total_price: number | null, id: string | null, guests: number | null } | null> | null };

export type GetListingQueryVariables = Exact<{
  listing_id: string;
}>;


export type GetListingQuery = { listing: { _id: string, description: string, host_id: string, photos: Array<string | null> | null, price: number, rating_avg: number | null, title: string, type: string, location: { city: string | null, country: string | null, address: string | null } | null } | null };

export type GetListingsQueryVariables = Exact<{
  filters?: FiltersInput | null | undefined;
}>;


export type GetListingsQuery = { listings: Array<{ _id: string, type: string, price: number, title: string, description: string, photos: Array<string | null> | null, rating: number | null, availabilityRange: Array<string | null> | null, location: { address: string | null, city: string | null, country: string | null } | null }> | null };


export const GetUserBookingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserBookings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"guestBookings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"photos"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"start_date"}},{"kind":"Field","name":{"kind":"Name","value":"end_date"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"total_price"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"guests"}}]}}]}}]} as unknown as DocumentNode<GetUserBookingsQuery, GetUserBookingsQueryVariables>;
export const GetListingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetListing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"listing_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"listing_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"listing_id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"host_id"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"city"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"photos"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"rating_avg"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<GetListingQuery, GetListingQueryVariables>;
export const GetListingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetListings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filters"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"FiltersInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filters"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filters"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"photos"}},{"kind":"Field","name":{"kind":"Name","value":"rating"}},{"kind":"Field","name":{"kind":"Name","value":"availabilityRange"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"city"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}}]}}]}}]} as unknown as DocumentNode<GetListingsQuery, GetListingsQueryVariables>;