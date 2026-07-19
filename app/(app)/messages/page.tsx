import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";

/** Right pane with nothing selected yet — the rail lives in the layout. */
export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<MessageSquare />}
        title="Select a conversation"
        description="Pick a booking on the left to open its thread."
      />
    </div>
  );
}
