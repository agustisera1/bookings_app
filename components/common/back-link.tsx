import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/shared/utils";

// Explicit `href`, not `router.back()`: the destination must not depend on how the user arrived.
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft className="size-4" />
      {children}
    </Link>
  );
}
