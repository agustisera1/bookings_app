import { Separator } from "@/components/ui/separator";

export function GroupHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h2>
      <span className="text-xs text-muted-foreground/70 tabular-nums">
        {count}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
