import { SendHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Counterpart } from "./types";

export function ChatComposer({ counterpart }: { counterpart: Counterpart }) {
  // Sending is not wired yet — real-time delivery arrives with the messaging
  // feature. The field is shown disabled so the surface reads as complete.
  return (
    <div className="border-t bg-card px-4 py-3 sm:px-6">
      <div className="flex items-end gap-1.5 rounded-2xl border bg-background p-1.5 opacity-70">
        <Textarea
          disabled
          rows={1}
          placeholder={`Message your ${counterpart.toLowerCase()}…`}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100"
        />
        <Button
          size="icon"
          disabled
          className="size-9 shrink-0 rounded-xl"
          aria-label="Send message"
        >
          <SendHorizontalIcon />
        </Button>
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted-foreground">
        Real-time messaging is coming to this booking — you&apos;ll be able to
        reply here soon.
      </p>
    </div>
  );
}
