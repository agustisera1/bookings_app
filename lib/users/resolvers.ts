import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getUserSummary } from "./queries";

export const usersResolvers: Resolvers = {
  // A field resolver: the lookup only runs for a query that asks for the host.
  Booking: {
    host: async (booking) => {
      const hostId = booking.listing?.host_id;
      if (!hostId) return null;

      const result = await getUserSummary(hostId);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
  },
};
