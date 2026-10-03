"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FEEDBACK_MS = 2000;

// `label` is both the tooltip and the accessible name: name what gets copied.
export function CopyButton({ value, label }: { value: string; label: string }) {
  // A counter, not a boolean: copying again while the check is up has to rearm
  // the timer, and `setCopied(true)` on an already-`true` state doesn't re-run.
  const [copies, setCopies] = useState(0);
  const copied = copies > 0;

  useEffect(() => {
    if (!copies) return;
    const timer = setTimeout(() => setCopies(0), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copies]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopies((count) => count + 1);
    } catch {
      // `navigator.clipboard` doesn't exist outside a secure context, so on a
      // plain http:// origin every call throws and there is nothing to retry.
      toast.error("Could not copy to the clipboard");
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            <span className="sr-only">{label}</span>
          </Button>
        }
      />
      <TooltipContent variant="dark">
        {copied ? "Copied" : label}
      </TooltipContent>
    </Tooltip>
  );
}
