import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getListing, getListings } from "./queries";

export const listingsResolvers: Resolvers = {
  Query: {
    listing: async (_, { id }) => {
      const result = await getListing(id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
    listings: async (_, { filters = null }) => {
      const result = await getListings(filters);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
  },
  Listing: {
    id: (listing) => listing._id,
  },
};
