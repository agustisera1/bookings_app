import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Way out of a detail route, back to the list it came from. Every `[id]` page
 * owes the user one, except where the layout already keeps the list on screen
 * (`app/(app)/messages`, whose rail never leaves).
 *
 * Takes an explicit `href` rather than `router.back()`: the destination has to
 * be the same whether the user arrived by click, by deep link or by reload.
 */
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
