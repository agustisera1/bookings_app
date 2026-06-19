import { cn } from "@/lib/utils";

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calcNights(from: Date | undefined, to: Date | undefined): number {
  if (!from || !to) return 0;
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export const datePickerTriggerClass = (hasValue: boolean) =>
  cn(
    "h-10 w-full justify-start rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    !hasValue && "text-muted-foreground",
  );
