import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// `icon` is a rendered node, not a component reference, so it serializes across the RSC boundary.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        className,
      )}
    >
      {icon && (
        <span className="text-muted-foreground [&_svg]:size-6">{icon}</span>
      )}
      {title && <p className="text-base font-medium">{title}</p>}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
