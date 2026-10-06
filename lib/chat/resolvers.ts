import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getChatThread, getUnreadMessagesCount, getUserConversations } from "./queries";

export const chatResolvers: Resolvers = {
  Query: {
    conversations: async () => {
      const result = await getUserConversations();
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
    unreadMessagesCount: async () => {
      const result = await getUnreadMessagesCount();
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
    chatThread: async (_, { id, from }) => {
      const result = await getChatThread(id, from ?? null);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
  },
  ChatMeta: {
    id: (chat) => chat._id,
  },
  ChatMessage: {
    id: (message) => message._id,
  },
};
