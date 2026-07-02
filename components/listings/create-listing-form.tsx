"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createListing } from "@/lib/services/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const PROPERTY_TYPES = [
  "apartment",
  "house",
  "cabin",
  "loft",
  "villa",
  "room",
  "other",
] as const;

const AMENITIES = [
  "wifi",
  "kitchen",
  "parking",
  "pool",
  "air_conditioning",
  "heating",
  "tv",
  "washer",
  "gym",
  "workspace",
  "pets_allowed",
] as const;

function humanize(value: string) {
  return value
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

const createListingSchema = z.object({
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
  attributes: z.object({
    beds: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    max_guests: z
      .number({ error: "Enter max guests" })
      .int()
      .min(1, "At least 1 guest"),
    check_in_time: z.string().optional(),
    check_out_time: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    minimum_nights: z.number().int().min(1).optional(),
    property_type: z.enum(PROPERTY_TYPES).optional(),
  }),
});

export type CreateListingFormValues = z.infer<typeof createListingSchema>;

export function CreateListingForm() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CreateListingFormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      description: "",
      location: { address: "", city: "", country: "" },
      attributes: { max_guests: 1, amenities: [] },
    },
  });

  async function onSubmit(data: CreateListingFormValues) {
    const result = await createListing({ ...data, type: "accommodation" });
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
  }

  if (isSubmitSuccessful) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <span className="text-3xl">🎉</span>
        <p className="font-medium">Listing created!</p>
        <p className="text-sm text-muted-foreground">
          Your new listing is now live.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic info</CardTitle>
          <CardDescription>What are you listing?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Cozy loft in Palermo"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Tell guests what makes this place special…"
              className="resize-none"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Price per night (USD)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              placeholder="120"
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location</CardTitle>
          <CardDescription>Where is this listing located?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Av. Santa Fe 1234"
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
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Buenos Aires"
                {...register("location.city")}
              />
              {errors.location?.city && (
                <p className="text-xs text-destructive">
                  {errors.location.city.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Argentina"
                {...register("location.country")}
              />
              {errors.location?.country && (
                <p className="text-xs text-destructive">
                  {errors.location.country.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
          <CardDescription>
            Sleeping arrangements and house rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="beds">Beds</Label>
              <Input
                id="beds"
                type="number"
                min={0}
                {...register("attributes.beds", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                {...register("attributes.bathrooms", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max_guests">Max guests</Label>
              <Input
                id="max_guests"
                type="number"
                min={1}
                {...register("attributes.max_guests", { valueAsNumber: true })}
              />
              {errors.attributes?.max_guests && (
                <p className="text-xs text-destructive">
                  {errors.attributes.max_guests.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="check_in_time">Check-in time</Label>
              <Input
                id="check_in_time"
                type="time"
                className="h-10 dark:[color-scheme:dark]"
                {...register("attributes.check_in_time")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="check_out_time">Check-out time</Label>
              <Input
                id="check_out_time"
                type="time"
                className="h-10 dark:[color-scheme:dark]"
                {...register("attributes.check_out_time")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minimum_nights">Minimum nights</Label>
              <Input
                id="minimum_nights"
                type="number"
                min={1}
                {...register("attributes.minimum_nights", {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property_type">Property type</Label>
              <Controller
                control={control}
                name="attributes.property_type"
                render={({ field }) => (
                  <Select
                    value={field.value ?? null}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="property_type" className="w-full">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {humanize(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amenities">Amenities</Label>
            <Controller
              control={control}
              name="attributes.amenities"
              render={({ field }) => (
                <Select
                  multiple
                  value={field.value ?? []}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="amenities" className="w-full">
                    <SelectValue placeholder="Select amenities">
                      {(selected: string[]) =>
                        selected.length
                          ? selected.map(humanize).join(", ")
                          : "Select amenities"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AMENITIES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {humanize(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create listing"}
        </Button>
      </div>
    </form>
  );
}
