import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateListingStep } from "./create-listing-model";

export function StepIndicator({
  steps,
  current,
}: {
  steps: CreateListingStep[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const last = index === steps.length - 1;

        return (
          <li
            key={step.label}
            className={cn("flex items-center gap-2", !last && "flex-1")}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-4xl text-2xs font-semibold ring-1 transition-colors",
                done && "bg-success text-success-foreground ring-transparent",
                active && "bg-primary text-primary-foreground ring-transparent",
                !done && !active && "bg-muted text-muted-foreground ring-border",
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {!last && (
              <span
                className={cn("h-px flex-1 bg-border", done && "bg-success")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
