"use client";

import { authUser } from "@/lib/services/auth";
import {
  fieldErrorsFrom,
  formDataToObject,
  signInSchema,
} from "@/lib/validation/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function SignInPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    const { success, error } = signInSchema.safeParse(
      formDataToObject(formData),
    );

    if (!success) {
      setStatus("error");
      setFieldErrors(fieldErrorsFrom(error));
      return;
    }

    setStatus("loading");
    const response = await authUser(formData);

    if (!response.ok) {
      setStatus("error");
      setMessage(response.error);
    } else {
      router.push("/profile");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 p-6 rounded-md gap-4 flex flex-col items-end w-80"
    >
      <h1 className="w-full text-lg font-semibold text-white">Sign in</h1>

      <div className="flex flex-col w-full">
        <label className="text-xs text-gray-400" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          className="text-sm bg-gray-700 rounded-sm p-2 mt-1 text-white"
          placeholder="you@example.com"
        />
        {fieldErrors.email && (
          <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>
        )}
      </div>

      <div className="flex flex-col w-full">
        <label className="text-xs text-gray-400" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="text-sm bg-gray-700 rounded-sm p-2 mt-1 text-white"
        />
        {fieldErrors.password && (
          <p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>
        )}
      </div>

      {message && (
        <p
          className={`w-full text-xs rounded-sm px-3 py-2 ${
            status === "success"
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="cursor-pointer bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md text-sm text-white transition-colors"
      >
        {status === "loading" ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
