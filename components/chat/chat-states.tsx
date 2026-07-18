import { MessagesSquareIcon, TriangleAlertIcon } from "lucide-react";
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
  const other = counterpart.toLowerCase();
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={<MessagesSquareIcon />}
        title={`Say hello to your ${other}`}
        description={`No messages yet — send the first one and it'll show up here.`}
      />
    </div>
  );
}

export function ErrorState({ message }: { message: string | null }) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        // Not a wifi glyph: this state covers any failure to load the thread,
        // and the vast majority are server-side. Blaming the user's connection
        // sends them to check their router for something we broke.
        icon={<TriangleAlertIcon />}
        title="Couldn't load this conversation"
        description={message ?? "Please try again in a moment."}
      />
    </div>
  );
}
