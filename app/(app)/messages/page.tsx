import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Messages" };

/** Right pane with nothing selected yet — the rail lives in the layout. */
export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<MessageSquare />}
        title="Select a conversation"
        description="Pick a conversation to open its thread."
      />
    </div>
  );
}
