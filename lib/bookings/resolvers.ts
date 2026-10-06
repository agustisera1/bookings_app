import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getBooking, getUserBookings } from "./queries";

export const bookingsResolvers: Resolvers = {
  Query: {
    booking: async (_, { id }) => {
      const result = await getBooking(id);
      if (!result.ok) throw toGraphQLError(result);
      const { booking, party, listing } = result.data;
      return { ...booking, party, listing };
    },
    guestBookings: async () => {
      const result = await getUserBookings();
      if (!result.ok) throw toGraphQLError(result);
      return result.data.map((booking) => ({ ...booking, party: "guest" as const }));
    },
  },
  Listing: {
    availability: (listing, _, { loaders }) => loaders.listingAvailability.load(listing._id),
    bookings: async (listing, _, { loaders }) => {
      const bookings = await loaders.listingBookings.load(listing._id);
      return bookings.map((booking) => ({ ...booking, party: "host" as const }));
    },
  },
};
