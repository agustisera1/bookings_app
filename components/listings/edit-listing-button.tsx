"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  variant = "icon",
}: {
  listingId: string;
  defaultValues: EditListingFormValues;
  variant?: "icon" | "manage";
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {variant === "manage" ? (
        <DialogTrigger
          render={
            <Button variant="outline" size="sm">
              <Pencil className="size-4" />
              Manage
            </Button>
          }
        />
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
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
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
          <DialogDescription>
            Update the details for this listing.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            label="Title"
            htmlFor="edit-listing-title"
            error={errors.title?.message}
          >
            <Input
              id="edit-listing-title"
              disabled={isSubmitting}
              {...register("title")}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="edit-listing-description"
            error={errors.description?.message}
          >
            <Textarea
              id="edit-listing-description"
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormField>

          <FormField
            label="Price per night (USD)"
            htmlFor="edit-listing-price"
            error={errors.price?.message}
          >
            <Input
              id="edit-listing-price"
              type="number"
              min={0}
              step="0.01"
              disabled={isSubmitting}
              {...register("price", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Address"
            htmlFor="edit-listing-address"
            error={errors.location?.address?.message}
          >
            <Input
              id="edit-listing-address"
              disabled={isSubmitting}
              {...register("location.address")}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="City"
              htmlFor="edit-listing-city"
              error={errors.location?.city?.message}
            >
              <Input
                id="edit-listing-city"
                disabled={isSubmitting}
                {...register("location.city")}
              />
            </FormField>
            <FormField
              label="Country"
              htmlFor="edit-listing-country"
              error={errors.location?.country?.message}
            >
              <Input
                id="edit-listing-country"
                disabled={isSubmitting}
                {...register("location.country")}
              />
            </FormField>
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              disabled={isSubmitting}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
