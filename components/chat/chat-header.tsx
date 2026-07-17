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
    <header className="flex items-center gap-3 border-b bg-card/60 px-4 py-3 backdrop-blur-sm sm:px-6">
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
