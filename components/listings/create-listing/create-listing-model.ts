import { z } from "zod";
import type {
  Control,
  DefaultValues,
  FieldErrors,
  FieldPath,
  UseFormRegister,
} from "react-hook-form";
import { PROPERTY_TYPES } from "@/lib/listings";

export const createListingSchema = z.object({
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

export const DEFAULT_VALUES: DefaultValues<CreateListingFormValues> = {
  title: "",
  description: "",
  location: { address: "", city: "", country: "" },
  attributes: { max_guests: 1, amenities: [] },
};

/** What every step body needs from the form it belongs to. */
export type StepFieldsProps = {
  register: UseFormRegister<CreateListingFormValues>;
  control: Control<CreateListingFormValues>;
  errors: FieldErrors<CreateListingFormValues>;
  disabled: boolean;
};

export type CreateListingStep = {
  label: string;
  description: string;
  /** Validated before advancing, so a step never hides an error behind it. */
  fields: FieldPath<CreateListingFormValues>[];
};

export const STEPS: CreateListingStep[] = [
  {
    label: "Basics",
    description: "Name your place and set what a night costs.",
    fields: ["title", "description", "price"],
  },
  {
    label: "Location",
    description: "Tell guests where they will be staying.",
    fields: ["location.address", "location.city", "location.country"],
  },
  {
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
