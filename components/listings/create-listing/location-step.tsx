import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/field";
import type { StepFieldsProps } from "./create-listing-model";

export function LocationStep({ register, errors, disabled }: StepFieldsProps) {
  return (
    <>
      <FormField
        label="Address"
        htmlFor="create-listing-address"
        error={errors.location?.address?.message}
      >
        <Input
          id="create-listing-address"
          placeholder="Av. Santa Fe 1234"
          disabled={disabled}
          {...register("location.address")}
        />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="City"
          htmlFor="create-listing-city"
          error={errors.location?.city?.message}
        >
          <Input
            id="create-listing-city"
            placeholder="Buenos Aires"
            disabled={disabled}
            {...register("location.city")}
          />
        </FormField>
        <FormField
          label="Country"
          htmlFor="create-listing-country"
          error={errors.location?.country?.message}
        >
          <Input
            id="create-listing-country"
            placeholder="Argentina"
            disabled={disabled}
            {...register("location.country")}
          />
        </FormField>
      </div>
    </>
  );
}
