import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./auth";

function messageFor(
  result: ReturnType<typeof signUpSchema.safeParse>,
  field: string,
): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
}

describe("signUpSchema", () => {
  it("accepts a valid sign-up and trims the name", () => {
    const result = signUpSchema.safeParse({
      name: "  Jane  ",
      email: "jane@example.com",
      password: "password1",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Jane");
  });

  it("rejects a blank name", () => {
    const result = signUpSchema.safeParse({
      name: "   ",
      email: "jane@example.com",
      password: "password1",
    });
    expect(messageFor(result, "name")).toBe("Full name is required");
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      name: "Jane",
      email: "jane@example.com",
      password: "short",
    });
    expect(messageFor(result, "password")).toBe("Password must be at least 8 characters");
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      name: "Jane",
      email: "nope",
      password: "password1",
    });
    expect(messageFor(result, "email")).toBe("Enter a valid email address");
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password with a valid email", () => {
    expect(
      signInSchema.safeParse({ email: "jane@example.com", password: "x" }).success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({ email: "jane@example.com", password: "" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.find((i) => i.path[0] === "password")?.message).toBe(
        "Password is required",
      );
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({ email: "nope", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.find((i) => i.path[0] === "email")?.message).toBe(
        "Enter a valid email address",
      );
  });
});
