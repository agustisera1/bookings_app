import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/shared/utils";

// Repeats the primitive's `data-[size=lg]:sm:` prefix so tailwind-merge drops its `max-w`;
// a bare `sm:max-w-2xl` loses on specificity.
export function WideDialogContent({
  className,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, "size">) {
  return (
    <DialogContent
      size="lg"
      className={cn("max-h-[85dvh] data-[size=lg]:sm:max-w-2xl", className)}
      {...props}
    />
  );
}
