import mongoClientPromise from "../mongo";
import { GraphQLError } from "graphql";
import type { Listing, Resolvers } from "./__generated__/resolvers-types";
import { ObjectId } from "mongodb";

export const resolvers: Resolvers = {
  Query: {
    listing: async (_, { listing_id }) => {
      try {
        const client = await mongoClientPromise;
        const doc = await client
          .db("listingsdb")
          .collection("listings")
          .findOne({ _id: new ObjectId(listing_id) });

        return doc ? { ...doc, _id: doc._id.toString() } as Listing : null;
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
        const textFiltering = term ? { $text: { $search: term } } : {};
        const mongoClient = await mongoClientPromise;
        const cursor = mongoClient
          .db("listingsdb")
          .collection("listings")
          .find(textFiltering);
        const docs = await (limit ? cursor.limit(limit) : cursor).toArray();
        return docs.map((doc) => ({ ...doc, _id: doc._id.toString() })) as Listing[];
      } catch (error) {
        throw new GraphQLError("Failed to fetch listings", {
          originalError: error instanceof Error ? error : undefined,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};
