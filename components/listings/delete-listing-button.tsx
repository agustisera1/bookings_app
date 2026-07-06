"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { deleteListing } from "@/lib/services/listings";

export function DeleteListingButton({
  listingId,
  listingTitle,
  variant = "icon",
}: {
  listingId: string;
  listingTitle: string;
  variant?: "icon" | "button";
}) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteListing(listingId);
    if (!result.ok) {
      toast.error(result.error);
      return false; // keep the dialog open to retry
    }
    toast.success("Listing deleted");
    // Deleting from the detail page leaves the user on a listing that no
    // longer exists, so send them back to their listings.
    if (variant === "button") router.push("/listings/mine");
  }

  const trigger =
    variant === "button" ? (
      <Button variant="destructive" size="sm">
        <Trash2 className="size-4" />
        Delete
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 />
        <span className="sr-only">Delete listing</span>
      </Button>
    );

  return (
    <ConfirmDialog
      trigger={trigger}
      tooltip={variant === "icon" ? "Delete" : undefined}
      title="Delete this listing?"
      description={`This will permanently delete "${listingTitle}". This action cannot be undone.`}
      confirmLabel="Yes, delete"
      pendingLabel="Deleting…"
      onConfirm={handleDelete}
    />
  );
}
