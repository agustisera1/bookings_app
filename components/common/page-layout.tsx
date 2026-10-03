import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// `sticky`, not fixed: it pins against whichever scroll container encloses it.
// No `max-w-*`: a page fills its column and the padding gives the breathing room.
export function PageLayout({
  title,
  subtitle,
  back,
  actions,
  toolbar,
  inlineToolbar = false,
  className,
  contentClassName,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: ReactNode;
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
      {/* A `div`, not a `p`: `subtitle` takes any node, and a block-level one
          (the loading state's `Skeleton`) closes a `p` early in the parser,
          which desyncs the server and client DOM. */}
      {subtitle && (
        <div className="max-w-2xl text-sm text-muted-foreground text-pretty">
          {subtitle}
        </div>
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
          {back}
          {inlineToolbar && toolbar ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
              <div className="md:shrink-0">{heading}</div>
              <div className="flex items-center gap-2 md:ml-auto md:w-1/2 md:min-w-0">
                <div className="min-w-0 flex-1">{toolbar}</div>
                {actions && (
                  <div className="flex shrink-0 gap-2">{actions}</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
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
