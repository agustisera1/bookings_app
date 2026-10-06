import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";

export const usersResolvers: Resolvers = {
  // A field resolver: the lookup only runs for a query that asks for the host.
  Booking: {
    host: (booking, _, { loaders }) => {
      const hostId = booking.listing?.host_id;
      return hostId ? loaders.userSummary.load(hostId) : null;
    },
  },
};
