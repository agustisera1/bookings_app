/**
 * Discriminated result returned by every function in `lib/services/*`.
 *
 * This is NOT an HTTP response. Service functions are plain functions that
 * get called from two very different places:
 *
 * 1. Server Actions / Server Components — there is no real HTTP boundary
 *    here (Next.js handles the RPC wire format internally), so the caller
 *    just narrows on `.ok` and reads `.data` / `.error` directly.
 *
 * 2. Route Handlers (`app/api/.../route.ts`) — this IS a real HTTP boundary.
 *    `code` is a semantic error kind, not a number — it only becomes a real
 *    HTTP status when explicitly converted, see `toHttpResponse` in
 *    `lib/http.ts`. The service itself never needs to know HTTP exists.
 *
 * The `ok` discriminant (instead of `data: T | null` + `error: string | null`)
 * means TypeScript narrows `data`'s type for free and the impossible states
 * (`data` and `error` both set, or both empty) simply aren't representable.
 */
export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNEXPECTED";

export type ServiceResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode };
