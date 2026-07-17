import { MessagesSquareIcon, WifiOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Counterpart } from "./types";

export function ThreadSkeleton() {
  const rows = [
    { mine: false, w: "w-40" },
    { mine: false, w: "w-56" },
    { mine: true, w: "w-48" },
    { mine: false, w: "w-32" },
    { mine: true, w: "w-52" },
  ];
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn("flex", row.mine ? "justify-end" : "justify-start")}
        >
          <Skeleton className={cn("h-9 rounded-2xl", row.w)} />
        </div>
      ))}
    </div>
  );
}

export function EmptyThread({ counterpart }: { counterpart: Counterpart }) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={<MessagesSquareIcon />}
        title="No messages yet"
        description={`This is where your conversation with your ${counterpart.toLowerCase()} will appear.`}
      />
    </div>
  );
}

export function ErrorState({ message }: { message: string | null }) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={<WifiOffIcon />}
        title="Couldn't load this conversation"
        description={message ?? "Please try again in a moment."}
      />
    </div>
  );
}
