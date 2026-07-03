import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Centered placeholder for the "nothing here yet" state of a section or list.
 * Every slot is optional so it scales from a bare message to an illustrated
 * call-to-action.
 *
 * Pass `icon` as a rendered node (`icon={<ImageOff />}`), not a component
 * reference, so it stays serializable across the RSC boundary.
 *
 * For a compact status line inside a dense list, a plain
 * `<p className="text-sm text-muted-foreground">` is lighter — reach for
 * `EmptyState` when the empty state deserves its own centered block.
 */
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
