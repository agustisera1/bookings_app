"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Return `false` from `onConfirm` to keep the dialog open for a retry.
// Callers pass a plain `<Button>`: a trigger pre-wrapped in a Server Component hydrates inconsistently.
export function ConfirmDialog({
  trigger,
  tooltip,
  title,
  description,
  confirmLabel = "Confirm",
  pendingLabel,
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
}: {
  trigger: ReactElement;
  tooltip?: string;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"];
  onConfirm: () => void | boolean | Promise<void | boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    const result = await onConfirm();
    setIsPending(false);
    if (result === false) return; // keep open so the user can retry
    setOpen(false);
  }

  const alertTrigger = <AlertDialogTrigger render={trigger} />;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={alertTrigger} />
          <TooltipContent variant="dark">{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        alertTrigger
      )}

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            variant={confirmVariant}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
