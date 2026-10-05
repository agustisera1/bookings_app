"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { createUser } from "@/lib/auth/actions";
import { signUpSchema, type SignUpInput } from "@/lib/auth/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/field";

const ALERT_ENTER =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1";

export function SignUpForm() {
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
            <Input id="name" autoComplete="name" {...register("name")} />
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              {...register("email")}
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            description="At least 8 characters"
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </FormField>

          {isSubmitSuccessful ? (
            <Alert
              className={`${ALERT_ENTER} border-success/40 bg-success/10 text-success dark:bg-success/20 [&>svg]:text-success`}
            >
              <CheckCircle2 />
              <AlertTitle>You&apos;re all set</AlertTitle>
              <AlertDescription className="text-success/90">
                Account created. You can now sign in.
              </AlertDescription>
            </Alert>
          ) : (
            errors.root && (
              <Alert
                variant="destructive"
                className={`${ALERT_ENTER} border-destructive/40 bg-destructive/10 dark:bg-destructive/20`}
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
            {isSubmitting ? "Creating account…" : "Sign up"}
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
