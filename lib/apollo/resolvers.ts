import type { Listing, Resolvers } from "./__generated__/resolvers-types";
import { GraphQLError } from "graphql";
import { Document, Filter, ObjectId } from "mongodb";
import { Booking, getUserBookings, GuestBooking } from "../services/bookings";
import mongoClientPromise from "../mongo";

export const resolvers: Resolvers = {
  Query: {
    listing: async (_, { listing_id }) => {
      try {
        const client = await mongoClientPromise;
        const doc = await client
          .db("listingsdb")
          .collection("listings")
          .findOne({ _id: new ObjectId(listing_id) });

        return doc ? ({ ...doc, _id: doc._id.toString() } as Listing) : null;
      } catch (error) {
        throw new GraphQLError("Failed to fetch listing detail", {
          originalError: error instanceof Error ? error : undefined,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    listings: async (_, { limit, term }) => {
      try {
        // TODO: Check for user authentication
        const filtering: Filter<Document> = {};
        if (term) filtering["$text"] = { $search: term };

        const mongoClient = await mongoClientPromise;
        const cursor = mongoClient
          .db("listingsdb")
          .collection("listings")
          .find(filtering);

        const docs = await (limit ? cursor.limit(limit) : cursor).toArray();
        return docs.map((doc) => ({
          ...doc,
          _id: doc._id.toString(),
        })) as Listing[];
      } catch (error) {
        throw new GraphQLError("Failed to fetch listings", {
          originalError: error instanceof Error ? error : undefined,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    guestBookings: async (_, { guest_id }) => {
      let ids: string[] = [];
      // 1. Search the guest bookings
      const userBookingsResult = await getUserBookings(guest_id!);
      if (!userBookingsResult.ok) {
        throw new Error("Error while retrieving user bookings");
      } else {
        ids = (userBookingsResult.data as Booking[]).map(
          ({ listing_id }) => listing_id,
        );
      }

      // 2. Search documents the guest booked listings
      const filtering: Filter<Document> = {};
      if (!!ids?.length)
        filtering["_id"] = { $in: ids.map((id) => new ObjectId(id!)) };
      const mongoClient = await mongoClientPromise;
      const cursor = mongoClient
        .db("listingsdb")
        .collection("listings")
        .find(filtering);

      const docs = await cursor.toArray();
      const bookings = userBookingsResult.data;

      return bookings
        .map(({ listing_id, ...booking }) => {
          const listing = docs.find(({ _id }) => listing_id === _id.toString());
          if (!listing) {
            console.error(
              `Mismatch between listing and booking: ${listing_id}`,
            );
            return undefined;
          } else
            return {
              type: listing.type,
              title: listing.title,
              created_at: booking.created_at,
              start_date: booking.start_date,
              end_date: booking.end_date,
              status: booking.status,
              total_price: parseInt(booking.total_price),
              id: booking.id,
              guests: booking.guests,
            } as GuestBooking;
        })
        .filter((el) => !!el);
    },
  },
};
