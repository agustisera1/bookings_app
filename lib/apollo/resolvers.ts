import mongoClientPromise from "../mongo";
import { GraphQLError } from "graphql";
import type { Resolvers } from "./__generated__/resolvers-types";

export const resolvers: Resolvers = {
  Query: {
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
        return docs.map((doc) => ({ ...doc, _id: doc._id.toString() }));
      } catch (error) {
        throw new GraphQLError("Failed to fetch listings", {
          originalError: error instanceof Error ? error : undefined,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};
