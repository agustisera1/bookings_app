"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { editListing } from "@/lib/services/listings";

const editListingSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  price: z
    .number({ error: "Enter a price" })
    .positive("Price must be greater than 0"),
  location: z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    country: z.string().min(1, "Country is required"),
  }),
});

type EditListingFormValues = z.infer<typeof editListingSchema>;

export function EditListingButton({
  listingId,
  defaultValues,
}: {
  listingId: string;
  defaultValues: EditListingFormValues;
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditListingFormValues>({
    resolver: zodResolver(editListingSchema),
    defaultValues,
  });

  function handleOpenChange(nextOpen: boolean) {
    // Discard any unsaved edits from a previous, cancelled attempt.
    if (nextOpen) reset(defaultValues);
    setOpen(nextOpen);
  }

  async function onSubmit(data: EditListingFormValues) {
    const result = await editListing(listingId, data);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error); // evita que RHF marque isSubmitSuccessful = true
    }
    setOpen(false);
    toast.success("Listing updated");
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button variant="ghost" size="icon-sm">
                  <Pencil />
                </Button>
              }
            />
          }
        />
        <TooltipContent variant="dark">Edit</TooltipContent>
      </Tooltip>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit listing</AlertDialogTitle>
          <AlertDialogDescription>
            Update the details for this listing.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-listing-title">Title</Label>
            <Input
              id="edit-listing-title"
              disabled={isSubmitting}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-listing-description">Description</Label>
            <Textarea
              id="edit-listing-description"
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-listing-price">Price per night (USD)</Label>
            <Input
              id="edit-listing-price"
              type="number"
              min={0}
              step="0.01"
              disabled={isSubmitting}
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-xs text-destructive">
                {errors.price.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-listing-address">Address</Label>
            <Input
              id="edit-listing-address"
              disabled={isSubmitting}
              {...register("location.address")}
            />
            {errors.location?.address && (
              <p className="text-xs text-destructive">
                {errors.location.address.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-listing-city">City</Label>
              <Input
                id="edit-listing-city"
                disabled={isSubmitting}
                {...register("location.city")}
              />
              {errors.location?.city && (
                <p className="text-xs text-destructive">
                  {errors.location.city.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-listing-country">Country</Label>
              <Input
                id="edit-listing-country"
                disabled={isSubmitting}
                {...register("location.country")}
              />
              {errors.location?.country && (
                <p className="text-xs text-destructive">
                  {errors.location.country.message}
                </p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
