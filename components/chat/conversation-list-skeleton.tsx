import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for the rail while it streams in. Mirrors `ConversationItem`'s
 * geometry — `size-12` avatar and three text lines under the same `p-2`/`gap-1`
 * as `ConversationList` — so the real list drops in without shifting the layout.
 */
export function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-12 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
