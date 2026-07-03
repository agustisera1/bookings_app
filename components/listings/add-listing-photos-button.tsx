"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/listings/image-upload";
import { editListing } from "@/lib/services/listings";

export function AddListingPhotosButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setFiles([]);
    setOpen(nextOpen);
  }

  async function handleSave() {
    setIsPending(true);
    const photos = files.map((file) => URL.createObjectURL(file));
    const result = await editListing(listingId, { photos });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setFiles([]);
    setOpen(false);
    toast.success("Photos uploaded");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <ImagePlus className="size-4" />
        Add photos
      </DialogTrigger>

      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add photos</DialogTitle>
        </DialogHeader>

        <ImageUpload value={files} onChange={setFiles} />

        <Button
          onClick={handleSave}
          disabled={isPending || files.length === 0}
          className="w-full"
        >
          {isPending ? "Saving…" : "Save photos"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
