import type { ReactNode } from "react";

// The aside's `top` clears the `PageLayout` sticky header.
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
