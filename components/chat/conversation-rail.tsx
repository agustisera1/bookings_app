import { ConversationList } from "./conversation-list";
import { getUserConversations } from "@/lib/services/chat";

// Awaits here, not in the layout, so under <Suspense> it streams in after the thread paints.
export async function ConversationRail() {
  const conversations = await getUserConversations();

  if (!conversations.ok)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Could not load your conversations. Try reloading the page.
      </p>
    );

  return <ConversationList conversations={conversations.data} />;
}
