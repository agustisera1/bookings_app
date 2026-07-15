import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page shell: a large `h1` heading that stays pinned to the top while
 * the content scrolls beneath it. Lives inside the `SidebarInset` scroll
 * container (`app/(app)/layout.tsx`), so the header uses `sticky top-0` rather
 * than owning its own scroll.
 *
 * This is the page-level counterpart to `Section` (`h2` blocks *within* a
 * page). Reach for `PageLayout` at the route boundary; use `Section` for the
 * blocks inside it.
 *
 * `actions` renders inline with the title (e.g. a primary "New listing"
 * button); `toolbar` renders on its own row below the heading (e.g. a search
 * field or filters) and is included in the sticky region.
 *
 * `inlineToolbar` compacts the header: the toolbar shares the heading's row,
 * pinned to the right at half the header width, instead of taking a row of its
 * own, collapsing back to a stacked layout below `md`.
 */
export function PageLayout({
  title,
  subtitle,
  actions,
  toolbar,
  inlineToolbar = false,
  className,
  contentClassName,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  inlineToolbar?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const heading = (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div
      data-slot="page-layout"
      className={cn("flex min-h-full flex-col", className)}
    >
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="flex flex-col gap-4 px-6 py-5 md:px-10 md:py-6">
          {inlineToolbar && toolbar ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
              <div className="md:shrink-0">{heading}</div>
              {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
              <div className="md:ml-auto md:w-1/2 md:min-w-0">{toolbar}</div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                {heading}
                {actions && (
                  <div className="flex shrink-0 gap-2">{actions}</div>
                )}
              </div>
              {toolbar}
            </>
          )}
        </div>
      </header>

      <div
        className={cn("flex-1 px-6 py-6 md:px-10 md:py-8", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
