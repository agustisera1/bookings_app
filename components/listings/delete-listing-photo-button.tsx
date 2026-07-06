"use client";

import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { removeListingPhoto } from "@/lib/services/listings";

type DeleteListingPhotoButtonProps = {
  listingId: string;
  photoUrl: string;
};

export function DeleteListingPhotoButton({
  listingId,
  photoUrl,
}: DeleteListingPhotoButtonProps) {
  async function handleConfirm() {
    const result = await removeListingPhoto(listingId, photoUrl);
    if (!result.ok) {
      toast.error(result.error);
      return false; // keep the dialog open to retry
    }
    toast.success("Photo removed");
  }

  return (
    <ConfirmDialog
      tooltip="Remove photo"
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1 z-10 size-6 rounded-full bg-background/90 text-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="size-3.5" />
          <span className="sr-only">Remove photo</span>
        </Button>
      }
      title="Remove this photo?"
      description="This permanently deletes the photo from the listing. This action cannot be undone."
      confirmLabel="Yes, remove"
      pendingLabel="Removing…"
      onConfirm={handleConfirm}
    />
  );
}
