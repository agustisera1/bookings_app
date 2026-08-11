import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { humanize } from "@/lib/utils";
import { AMENITIES, PROPERTY_TYPES } from "@/lib/listings";
import { NUMBER_FIELD, type StepFieldsProps } from "./create-listing-model";

export function DetailsStep({
  register,
  control,
  errors,
  disabled,
}: StepFieldsProps) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          label="Beds"
          htmlFor="create-listing-beds"
          error={errors.attributes?.beds?.message}
        >
          <Input
            id="create-listing-beds"
            type="number"
            min={0}
            disabled={disabled}
            {...register("attributes.beds", NUMBER_FIELD)}
          />
        </FormField>
        <FormField
          label="Bathrooms"
          htmlFor="create-listing-bathrooms"
          error={errors.attributes?.bathrooms?.message}
        >
          <Input
            id="create-listing-bathrooms"
            type="number"
            min={0}
            disabled={disabled}
            {...register("attributes.bathrooms", NUMBER_FIELD)}
          />
        </FormField>
        <FormField
          label="Max guests"
          htmlFor="create-listing-max-guests"
          error={errors.attributes?.max_guests?.message}
        >
          <Input
            id="create-listing-max-guests"
            type="number"
            min={1}
            disabled={disabled}
            {...register("attributes.max_guests", NUMBER_FIELD)}
          />
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Check-in time" htmlFor="create-listing-check-in">
          <Input
            id="create-listing-check-in"
            type="time"
            className="h-10 dark:[color-scheme:dark]"
            disabled={disabled}
            {...register("attributes.check_in_time")}
          />
        </FormField>
        <FormField label="Check-out time" htmlFor="create-listing-check-out">
          <Input
            id="create-listing-check-out"
            type="time"
            className="h-10 dark:[color-scheme:dark]"
            disabled={disabled}
            {...register("attributes.check_out_time")}
          />
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Minimum nights"
          htmlFor="create-listing-minimum-nights"
          error={errors.attributes?.minimum_nights?.message}
        >
          <Input
            id="create-listing-minimum-nights"
            type="number"
            min={1}
            disabled={disabled}
            {...register("attributes.minimum_nights", NUMBER_FIELD)}
          />
        </FormField>
        <FormField label="Property type" htmlFor="create-listing-property-type">
          <Controller
            control={control}
            name="attributes.property_type"
            render={({ field }) => (
              <Select
                value={field.value ?? null}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id="create-listing-property-type"
                  className="w-full"
                >
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {humanize(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <FormField label="Amenities" htmlFor="create-listing-amenities">
        <Controller
          control={control}
          name="attributes.amenities"
          render={({ field }) => (
            <Select
              multiple
              value={field.value ?? []}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger id="create-listing-amenities" className="w-full">
                <SelectValue placeholder="Select amenities">
                  {(selected: string[]) =>
                    selected.length
                      ? selected.map(humanize).join(", ")
                      : "Select amenities"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AMENITIES.map((amenity) => (
                  <SelectItem key={amenity} value={amenity}>
                    {humanize(amenity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
    </>
  );
}
