import { NextResponse } from "next/server";
import type { ErrorCode, ServiceResult } from "./types";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNEXPECTED: 500,
  FORBIDDEN: 403,
};

/**
 * Converts a ServiceResult into a real NextResponse for Route Handlers.
 *
 * This is the one and only place an HTTP status number gets attached. The
 * service layer only ever deals in semantic `code`s (CONFLICT, UNAUTHORIZED,
 * ...) — this function is what maps those to actual wire-level status codes.
 *
 * Server Actions / Server Components should NOT use this — they call
 * services directly and narrow on `.ok`.
 */
export function toHttpResponse<T>(result: ServiceResult<T>) {
  if (result.ok) return NextResponse.json(result, { status: 200 });
  return NextResponse.json(result, { status: STATUS_BY_CODE[result.code] });
}
