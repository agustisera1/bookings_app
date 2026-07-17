import { cn } from "@/lib/utils";
import type { Counterpart } from "./types";

/** Initial-letter avatar for the counterpart (we have no name, only the role). */
export function ChatAvatar({
  counterpart,
  className,
}: {
  counterpart: Counterpart;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20",
        className,
      )}
      aria-hidden
    >
      {counterpart[0]}
    </div>
  );
}
