"use client";

import { useState } from "react";
import { createUser } from "@/lib/services/auth";
import {
  fieldErrorsFrom,
  formDataToObject,
  signUpSchema,
} from "@/lib/validation/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" />
            {fieldErrors.name && (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" />
            {fieldErrors.password ? (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            )}
          </div>

          {message && (
            <Alert variant={status === "success" ? "default" : "destructive"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Creating account…" : "Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
