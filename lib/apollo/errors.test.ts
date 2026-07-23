import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";
import { toGraphQLError } from "./errors";

describe("toGraphQLError", () => {
  it("reuses the service's friendly message verbatim", () => {
    const err = toGraphQLError({ ok: false, error: "Email already exists", code: "CONFLICT" });
    expect(err).toBeInstanceOf(GraphQLError);
    expect(err.message).toBe("Email already exists");
    expect(err.extensions.code).toBe("CONFLICT");
  });

  it("maps the semantic code to its GraphQL equivalent", () => {
    expect(
      toGraphQLError({ ok: false, error: "x", code: "VALIDATION" }).extensions.code,
    ).toBe("BAD_USER_INPUT");
    expect(
      toGraphQLError({ ok: false, error: "x", code: "UNAUTHORIZED" }).extensions.code,
    ).toBe("UNAUTHENTICATED");
  });
});
