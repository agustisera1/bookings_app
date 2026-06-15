"use client";

import { useState } from "react";
import { createUser } from "@/lib/services/auth";

type Status = "idle" | "loading" | "success" | "error";

export default function SignUpPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const response = await createUser(formData);

    if (response.error) {
      setStatus("error");
      setMessage(response.error);
    } else {
      setStatus("success");
      setMessage("Account created! You can now sign in.");
      e.currentTarget.reset();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 p-6 rounded-md gap-4 flex flex-col items-end w-80"
    >
      <h1 className="w-full text-lg font-semibold text-white">Create account</h1>

      <div className="flex flex-col w-full">
        <label className="text-xs text-gray-400" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          className="text-sm bg-gray-700 rounded-sm p-2 mt-1 text-white"
        />
      </div>

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
        <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
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
        {status === "loading" ? "Creating account…" : "Sign Up"}
      </button>
    </form>
  );
}
