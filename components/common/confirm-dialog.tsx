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

/**
 * Confirmation dialog for a destructive or irreversible action fired outside a
 * form. Owns the open + pending state so callers only supply the trigger, the
 * copy, and what to do on confirm.
 *
 * `onConfirm` does the work (usually a service call + toast). Return `false` to
 * keep the dialog open so the user can retry (e.g. after a failed request);
 * return nothing/true to close it.
 *
 * This is the reusable form of the "AlertDialog + pending + error" pattern.
 * Because the `<Button>` trigger is composed with `AlertDialogTrigger` here (a
 * Client Component), callers pass a plain `<Button>` — never a pre-wrapped
 * trigger from a Server Component, which would hydrate inconsistently.
 */
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
