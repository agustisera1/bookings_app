import { z } from "zod";

// Shared by both the client form (instant feedback, no round trip) and the
// service layer (the actual source of truth — never trust client validation
// alone, since Server Actions can be called directly).
export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;

// FormData -> plain object, the shape zod (and most form libraries) expect.
export function formDataToObject(formData: FormData): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") entries[key] = value;
  }
  return entries;
}

// Flattens a ZodError into { fieldName: firstErrorMessage } for displaying
// inline next to each input, instead of one generic banner message.
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
