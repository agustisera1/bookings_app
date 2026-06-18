import mongoClientPromise from "../mongo";
import { GraphQLError } from "graphql";

export const resolvers = {
  Query: {
    listings: async () => {
      try {
        const mongoClient = await mongoClientPromise;
        return await mongoClient
          .db("listingsdb")
          .collection("listings")
          .find({})
          .toArray();
      } catch (error) {
        throw new GraphQLError("Failed to fetch listings", {
          originalError: error instanceof Error ? error : undefined,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};
