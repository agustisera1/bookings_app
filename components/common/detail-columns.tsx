import type { ReactNode } from "react";

/**
 * Two-column body of a detail page: the content column scrolls, the `aside`
 * pins once there is room for it. Collapses to a single column below `lg`.
 *
 * The aside's `top` clears the `PageLayout` sticky header — which is why the
 * offset lives here and not copied into each page that wants this shape.
 */
export function DetailColumns({
  aside,
  children,
}: {
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-8">{children}</div>
      {aside && (
        <aside className="flex flex-col gap-8 lg:sticky lg:top-32">
          {aside}
        </aside>
      )}
    </div>
  );
}
