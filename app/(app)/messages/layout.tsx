import { Suspense, type ReactNode } from "react";
import { ChatConnection } from "@/components/chat/chat-connection";
import { ConversationRail } from "@/components/chat/conversation-rail";
import { ConversationListSkeleton } from "@/components/chat/conversation-list-skeleton";
import { MarkMessagesSeen } from "@/components/chat/mark-messages-seen";

// A layout, so the rail keeps its scroll and isn't refetched between threads.
// Not `PageLayout`: each pane owns its own scroll.
export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <ChatConnection />
      <MarkMessagesSeen />
      <aside className="flex shrink-0 flex-col border-b border-foreground/10 bg-sidebar text-sidebar-foreground md:order-2 md:w-80 md:border-b-0 md:border-l lg:w-96">
        <header className="border-b border-foreground/10 px-5 py-5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Messages
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
