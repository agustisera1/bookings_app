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

/**
 * Icon-only button that copies `value` to the clipboard and swaps to a check
 * for a moment. `label` ("Copy email") is both the tooltip and the accessible
 * name, so it should name what gets copied.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
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
