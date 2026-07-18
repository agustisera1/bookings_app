import { formatDate } from "@/lib/dates";
import { ChatAvatar } from "./chat-avatar";
import type { Counterpart, Status } from "./types";

export function ChatHeader({
  counterpart,
  startedAt,
  status,
}: {
  counterpart: Counterpart;
  startedAt?: string;
  status: Status;
}) {
  return (
    // Transparent on purpose: the header takes whatever surface it sits on
    // (the pane in the messages view, the card when embedded), and the hairline
    // is what marks the edge in both.
    <header className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3 sm:px-6">
      <ChatAvatar counterpart={counterpart} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">
          Your {counterpart.toLowerCase()}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {status === "ready" && startedAt
            ? `Conversation started ${formatDate(startedAt)}`
            : "Direct messages about this booking"}
        </p>
      </div>
    </header>
  );
}
