import type { ReactNode } from "react";
import { ConversationList } from "@/components/chat/conversation-list";
import { getUserConversations } from "@/lib/services/chat";

/**
 * Two-pane messages shell: the conversation rail on the left, the selected
 * thread on the right. It lives in a layout (not in each page) so the rail
 * keeps its scroll position and isn't refetched when you switch threads.
 *
 * Deliberately not `PageLayout`: this view owns the full height and gives each
 * pane its own scroll, instead of one heading over one scrolling column.
 */
export default async function MessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const conversations = await getUserConversations();

  // The rail stays first in the DOM so it comes before the thread for keyboard
  // and screen-reader order, and stacks on top on mobile. `order` only flips it
  // to the right once the panes sit side by side.
  //
  // The rail carries `bg-sidebar` and the thread pane inherits `bg-background`.
  // In dark mode those tokens differ by a step (0.213 vs 0.142), so the seam
  // between the two panes is drawn by the surfaces themselves — the same way
  // the nav sidebar separates from the page — instead of by a border.
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-foreground/10 bg-sidebar text-sidebar-foreground md:order-2 md:w-80 md:border-b-0 md:border-l lg:w-96">
        <header className="border-b border-foreground/10 px-5 py-5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Messages
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.ok ? (
            <ConversationList conversations={conversations.data} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {conversations.error}
            </p>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col md:order-1">
        {children}
      </section>
    </div>
  );
}
