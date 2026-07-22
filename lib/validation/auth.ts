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
