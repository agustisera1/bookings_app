import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getListingReviews } from "./queries";

export const reviewsResolvers: Resolvers = {
  Listing: {
    reviews: async (listing) => {
      const result = await getListingReviews(listing._id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
  },
};
