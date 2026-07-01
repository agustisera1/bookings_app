import { cn } from "@/lib/utils";

export function parseTs(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  const d = new Date(Number(ts));
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: Date | string | null | undefined) {
  const d = date instanceof Date ? date : parseTs(date as string | null);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calcNights(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined,
): number {
  const s = from instanceof Date ? from : parseTs(from as string | null);
  const e = to instanceof Date ? to : parseTs(to as string | null);
  if (!s || !e) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86_400_000);
}

export const datePickerTriggerClass = (hasValue: boolean) =>
  cn(
    "h-10 w-full justify-start rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    !hasValue && "text-muted-foreground",
  );
