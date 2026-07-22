import { ConversationList } from "./conversation-list";
import { getUserConversations } from "@/lib/services/chat";

/**
 * The rail's data boundary. Its `await` lives here, not in the layout, so that
 * wrapped in `<Suspense>` it streams the list in after the thread has already
 * painted — a layout `await` would instead stall the whole shell on this query.
 */
export async function ConversationRail() {
  const conversations = await getUserConversations();

  if (!conversations.ok)
    return (
      <p className="p-4 text-sm text-muted-foreground">{conversations.error}</p>
    );

  return <ConversationList conversations={conversations.data} />;
}
