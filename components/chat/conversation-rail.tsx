import { ConversationList } from "./conversation-list";
import { query } from "@/lib/apollo/client";
import { GetConversationsDocument } from "@/lib/apollo/__generated__/operations";

// Awaits here, not in the layout, so under <Suspense> it streams in after the thread paints.
export async function ConversationRail() {
  const { data } = await query({ query: GetConversationsDocument, errorPolicy: "all" });
  const conversations = data?.conversations;

  if (!conversations)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Could not load your conversations. Try reloading the page.
      </p>
    );

  return <ConversationList conversations={conversations} />;
}
