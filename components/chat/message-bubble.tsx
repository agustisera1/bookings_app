import { cn } from "@/lib/utils";
import { ChatAvatar } from "./chat-avatar";
import type { Counterpart } from "./types";

export function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function MessageBubble({
  body,
  time,
  isMine,
  isRunStart,
  counterpart,
  pending = false,
  failed = false,
}: {
  body: string;
  time: string | null;
  isMine: boolean;
  isRunStart: boolean;
  counterpart: Counterpart;
  /** Rendered optimistically; the server hasn't confirmed it yet. */
  pending?: boolean;
  /** The server refused or failed to store it. */
  failed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full gap-2",
        isMine ? "justify-end" : "justify-start",
        isRunStart ? "mt-4 first:mt-0" : "mt-0.5",
      )}
    >
      {!isMine && (
        <div className="w-8 shrink-0 self-end">
          {isRunStart && (
            <ChatAvatar counterpart={counterpart} className="size-8" />
          )}
        </div>
      )}
      <div
        className={cn(
          "flex max-w-[78%] flex-col",
          isMine ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed transition-opacity",
            isMine ? "bg-accent/20 text-foreground" : "bg-muted text-foreground",
            isRunStart && (isMine ? "rounded-tr-md" : "rounded-tl-md"),
            // In flight: dimmed, so "sent" reads as a state change rather than
            // an instant that already happened.
            pending && "opacity-60",
            failed && "bg-destructive/15 ring-1 ring-destructive/40",
          )}
        >
          {body}
        </div>
        {failed ? (
          <span className="mt-1 px-1 text-2xs font-medium text-destructive">
            Not sent
          </span>
        ) : (
          time && (
            <span className="mt-1 px-1 text-2xs text-muted-foreground">
              {time}
            </span>
          )
        )}
      </div>
    </div>
  );
}
