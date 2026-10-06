import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getNotificationsCount, getUserNotifications } from "./queries";

export const notificationsResolvers: Resolvers = {
  Query: {
    notifications: async () => {
      const result = await getUserNotifications();
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
    notificationsCount: async () => {
      const result = await getNotificationsCount();
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
  },
  Notification: {
    id: (notification) => notification._id,
  },
};
