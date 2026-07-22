"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { createUser } from "@/lib/services/auth";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FormField } from "@/components/common/field";

export default function SignUpPage() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: SignUpInput) {
    const response = await createUser(data);
    if (!response.ok) {
      setError("root", { message: response.error });
      throw new Error(response.error);
    }
    // Keep the success flag through the reset so the confirmation stays up
    // while the fields clear.
    reset(undefined, { keepIsSubmitSuccessful: true });
  }

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Full name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
          </FormField>

          <Field>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <FieldError>{errors.password.message}</FieldError>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 8 characters
              </p>
            )}
          </Field>

          {isSubmitSuccessful ? (
            <Alert className="animate-in fade-in-0 slide-in-from-top-1 border-success/40 bg-success/10 text-success dark:bg-success/20 [&>svg]:text-success">
              <CheckCircle2 />
              <AlertTitle>You&apos;re all set</AlertTitle>
              <AlertDescription className="text-success/90">
                Account created! You can now sign in.
              </AlertDescription>
            </Alert>
          ) : (
            errors.root && (
              <Alert
                variant="destructive"
                className="animate-in fade-in-0 slide-in-from-top-1 border-destructive/40 bg-destructive/10 dark:bg-destructive/20"
              >
                <AlertCircle />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Creating account…" : "Sign Up"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/sign-in"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
