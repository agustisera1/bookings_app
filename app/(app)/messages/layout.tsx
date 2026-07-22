import { Suspense, type ReactNode } from "react";
import { ConversationRail } from "@/components/chat/conversation-rail";
import { ConversationListSkeleton } from "@/components/chat/conversation-list-skeleton";

/**
 * Two-pane messages shell: the conversation rail on the left, the selected
 * thread on the right. It lives in a layout (not in each page) so the rail
 * keeps its scroll position and isn't refetched when you switch threads.
 *
 * The rail is suspended rather than awaited here: the thread — the pane the
 * user came for — must not wait on the rail query behind it.
 *
 * Deliberately not `PageLayout`: this view owns the full height and gives each
 * pane its own scroll, instead of one heading over one scrolling column.
 */
export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-foreground/10 bg-sidebar text-sidebar-foreground md:order-2 md:w-80 md:border-b-0 md:border-l lg:w-96">
        <header className="border-b border-foreground/10 px-5 py-5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Messages
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Suspense fallback={<ConversationListSkeleton />}>
            <ConversationRail />
          </Suspense>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col md:order-1">
        {children}
      </section>
    </div>
  );
}
