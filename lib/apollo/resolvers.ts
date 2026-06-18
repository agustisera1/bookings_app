import mongoClientPromise from "../mongo";
import { GraphQLError } from "graphql";
import type { Resolvers } from "./__generated__/resolvers-types";
import { getCurrentUser } from "../services/auth";

export const resolvers: Resolvers = {
  Query: {
    listings: async () => {
      try {
        const user = await getCurrentUser();
        if (!user) throw new GraphQLError("Unauthorized");
        const mongoClient = await mongoClientPromise;
        const docs = await mongoClient
          .db("listingsdb")
          .collection("listings")
          .find({})
          .toArray();
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
