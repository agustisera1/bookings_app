import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * `DialogContent` for a dialog that carries a whole form — wider than anything
 * the vendored `size` scale offers.
 *
 * The override repeats the primitive's own `data-[size=lg]:sm:` prefix on
 * purpose: matching the variant chain is what lets tailwind-merge drop its
 * `max-w`. A bare `sm:max-w-2xl` leaves both rules standing, and the attribute
 * selector wins on specificity.
 */
export function WideDialogContent({
  className,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, "size">) {
  return (
    <DialogContent
      size="lg"
      className={cn("data-[size=lg]:sm:max-w-2xl", className)}
      {...props}
    />
  );
}
