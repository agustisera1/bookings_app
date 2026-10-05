import type { z } from "zod";
import type {
  Control,
  DefaultValues,
  FieldErrors,
  FieldPath,
  UseFormRegister,
} from "react-hook-form";
import type { createListingSchema } from "@/lib/listings/validation";

export type CreateListingFormValues = z.infer<typeof createListingSchema>;

export const DEFAULT_VALUES: DefaultValues<CreateListingFormValues> = {
  title: "",
  description: "",
  location: { address: "", city: "", country: "" },
  attributes: { max_guests: 1, amenities: [] },
};

// An empty number input must read as `undefined`, not the `NaN` of `valueAsNumber`.
export const NUMBER_FIELD = {
  setValueAs: (value: string) => (value === "" ? undefined : Number(value)),
};

/** What every step body needs from the form it belongs to. */
export type StepFieldsProps = {
  register: UseFormRegister<CreateListingFormValues>;
  control: Control<CreateListingFormValues>;
  errors: FieldErrors<CreateListingFormValues>;
  disabled: boolean;
};

export type StepId = "basics" | "location" | "details";

export type CreateListingStep = {
  id: StepId;
  label: string;
  description: string;
  // Validated by `goNext` before advancing; the last step's are covered on submit.
  fields: FieldPath<CreateListingFormValues>[];
};

export const STEPS: CreateListingStep[] = [
  {
    id: "basics",
    label: "Basics",
    description: "Name your place and set what a night costs.",
    fields: ["title", "description", "price"],
  },
  {
    id: "location",
    label: "Location",
    description: "Tell guests where they will be staying.",
    fields: ["location.address", "location.city", "location.country"],
  },
  {
    id: "details",
    label: "Details",
    description: "Capacity, house rules and what the place offers.",
    fields: [
      "attributes.beds",
      "attributes.bathrooms",
      "attributes.max_guests",
      "attributes.minimum_nights",
    ],
  },
];
