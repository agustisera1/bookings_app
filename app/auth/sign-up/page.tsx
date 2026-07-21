"use client";

import { useState } from "react";
import Link from "next/link";
import { createUser } from "@/lib/services/auth";
import {
  fieldErrorsFrom,
  formDataToObject,
  signUpSchema,
} from "@/lib/validation/auth";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FormField } from "@/components/common/field";

type Status = "idle" | "loading" | "success" | "error";

export default function SignUpPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    // Client-side validation for fast feedback; server re-validates as the real boundary.
    const { success, error } = signUpSchema.safeParse(
      formDataToObject(formData),
    );
    if (!success) {
      setStatus("error");
      setFieldErrors(fieldErrorsFrom(error));
      return;
    }

    setStatus("loading");
    const response = await createUser(formData);

    if (!response.ok) {
      setStatus("error");
      setMessage(response.error);
    } else {
      setStatus("success");
      setMessage("Account created! You can now sign in.");
      e.currentTarget?.reset();
    }
  }

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Full name" htmlFor="name" error={fieldErrors.name}>
            <Input id="name" name="name" />
          </FormField>

          <FormField label="Email" htmlFor="email" error={fieldErrors.email}>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
            />
          </FormField>

          <Field>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              aria-invalid={!!fieldErrors.password}
            />
            {fieldErrors.password ? (
              <FieldError>{fieldErrors.password}</FieldError>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 8 characters
              </p>
            )}
          </Field>

          {message &&
            (status === "success" ? (
              <Alert className="animate-in fade-in-0 slide-in-from-top-1 border-success/40 bg-success/10 text-success dark:bg-success/20 [&>svg]:text-success">
                <CheckCircle2 />
                <AlertTitle>You&apos;re all set</AlertTitle>
                <AlertDescription className="text-success/90">
                  {message}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert
                variant="destructive"
                className="animate-in fade-in-0 slide-in-from-top-1 border-destructive/40 bg-destructive/10 dark:bg-destructive/20"
              >
                <AlertCircle />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ))}

          <Button
            type="submit"
            size="lg"
            disabled={status === "loading"}
            className="w-full"
          >
            {status === "loading" ? "Creating account…" : "Sign Up"}
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
