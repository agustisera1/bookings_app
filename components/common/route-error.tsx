"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

/**
 * Shared body for a route `error.tsx` boundary: a centered `EmptyState` with a
 * "Try again" button wired to Next's `reset` and a caller-supplied escape hatch
 * (`homeAction`), since where "home" points depends on which segment failed.
 */
export function RouteError({
  icon,
  title,
  description,
  reset,
  homeAction,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  reset: () => void;
  homeAction?: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center p-10">
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={
          <div className="mt-2 flex items-center gap-2">
            <Button variant="outline" onClick={() => reset()}>
              Try again
            </Button>
            {homeAction}
          </div>
        }
      />
    </div>
  );
}
