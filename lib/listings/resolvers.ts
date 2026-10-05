import type { Listing, Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getListing, getListings } from "./queries";

// The casts bridge the Mongo document and the wire type, which GraphQL validates on the way out.
export const listingsResolvers: Resolvers = {
  Query: {
    listing: async (_, { listing_id }) => {
      const result = await getListing(listing_id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data as Listing | null;
    },
    listings: async (_, { filters = null }) => {
      const result = await getListings(filters);
      if (!result.ok) throw toGraphQLError(result);
      return result.data as Listing[];
    },
  },
};
