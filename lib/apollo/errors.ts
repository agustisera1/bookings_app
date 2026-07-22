import { GraphQLError } from "graphql";
import type { ErrorCode, ServiceResult } from "../types";

const GRAPHQL_CODE_BY_ERROR_CODE: Record<ErrorCode, string> = {
  VALIDATION: "BAD_USER_INPUT",
  UNAUTHORIZED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "TOO_MANY_REQUESTS",
  UNEXPECTED: "INTERNAL_SERVER_ERROR",
};

/**
 * Converts a failed ServiceResult into a GraphQLError for resolvers.
 *
 * Mirrors `toHttpResponse` in `lib/http.ts`: the one place that maps the
 * service layer's semantic `code` to a transport-level error shape. The
 * service's friendly `error` message is reused as-is (it's already safe to
 * expose to the client), so resolvers never need to invent their own copy.
 */
export function toGraphQLError(
  result: Extract<ServiceResult, { ok: false }>,
): GraphQLError {
  return new GraphQLError(result.error, {
    extensions: { code: GRAPHQL_CODE_BY_ERROR_CODE[result.code] },
  });
}
