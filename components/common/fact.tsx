import type { ReactNode } from "react";

// Renders `dt`/`dd`, so it must live inside a `dl`.
export function Fact({
  icon,
  label,
  value,
  note,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-muted-foreground uppercase [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="text-base font-medium">{value}</dd>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
