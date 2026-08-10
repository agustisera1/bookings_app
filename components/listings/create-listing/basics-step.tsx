import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/field";
import type { StepFieldsProps } from "./create-listing-model";

export function BasicsStep({ register, errors, disabled }: StepFieldsProps) {
  return (
    <>
      <FormField
        label="Title"
        htmlFor="create-listing-title"
        error={errors.title?.message}
      >
        <Input
          id="create-listing-title"
          placeholder="Cozy loft in Palermo"
          disabled={disabled}
          {...register("title")}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="create-listing-description"
        error={errors.description?.message}
      >
        <Textarea
          id="create-listing-description"
          rows={5}
          placeholder="Tell guests what makes this place special…"
          className="resize-none"
          disabled={disabled}
          {...register("description")}
        />
      </FormField>

      <FormField
        label="Price per night (USD)"
        htmlFor="create-listing-price"
        error={errors.price?.message}
      >
        <Input
          id="create-listing-price"
          type="number"
          min={0}
          step="0.01"
          placeholder="120"
          disabled={disabled}
          {...register("price", { valueAsNumber: true })}
        />
      </FormField>
    </>
  );
}
