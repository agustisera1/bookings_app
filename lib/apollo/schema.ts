import { makeExecutableSchema } from "@graphql-tools/schema";
import bookingsTypeDefs from "@/lib/bookings/schema.graphql";
import { bookingsResolvers } from "@/lib/bookings/resolvers";
import chatTypeDefs from "@/lib/chat/schema.graphql";
import { chatResolvers } from "@/lib/chat/resolvers";
import listingsTypeDefs from "@/lib/listings/schema.graphql";
import { listingsResolvers } from "@/lib/listings/resolvers";
import notificationsTypeDefs from "@/lib/notifications/schema.graphql";
import { notificationsResolvers } from "@/lib/notifications/resolvers";
import reviewsTypeDefs from "@/lib/reviews/schema.graphql";
import { reviewsResolvers } from "@/lib/reviews/resolvers";
import usersTypeDefs from "@/lib/users/schema.graphql";
import { usersResolvers } from "@/lib/users/resolvers";
import { rootResolvers } from "./resolvers";
import rootTypeDefs from "./schema.graphql";

// One executable schema: served by /api/graphql and run in-process by the RSC client.
export const schema = makeExecutableSchema({
  typeDefs: [
    rootTypeDefs,
    listingsTypeDefs,
    bookingsTypeDefs,
    reviewsTypeDefs,
    usersTypeDefs,
    notificationsTypeDefs,
    chatTypeDefs,
  ],
  resolvers: [
    rootResolvers,
    listingsResolvers,
    bookingsResolvers,
    reviewsResolvers,
    usersResolvers,
    notificationsResolvers,
    chatResolvers,
  ],
});
