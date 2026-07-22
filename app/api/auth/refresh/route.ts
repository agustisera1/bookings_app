import { hashToken, verifyToken } from "@/lib/jwt";
import {
  getUserSession,
  createRefreshToken,
  createAccessToken,
} from "@/lib/services/auth";
import { toHttpResponse } from "@/lib/http";
import { rateLimit, type RateLimitPolicy } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { cookies } from "next/headers";
import { JwtPayload } from "jsonwebtoken";

// Ver docs/tickets/TD-20-rate-limiting.md.
const REFRESH_IP_POLICY: RateLimitPolicy = {
  limit: 30,
  windowMs: 60_000,
  failMode: "open",
};

export async function POST() {
  const ip = await getClientIp();
  const limit = await rateLimit(`rl:refresh:ip:${ip}`, REFRESH_IP_POLICY);
  if (!limit.allowed)
    return toHttpResponse({
      ok: false,
      error: "Too many attempts. Please try again later.",
      code: "RATE_LIMITED",
    });

  const cookieStore = await cookies();
  const refresh_token = cookieStore.get("refresh_token")?.value;

  if (!refresh_token)
    return toHttpResponse({
      ok: false,
      error: "Refresh token not provided",
      code: "UNAUTHORIZED",
    });

  // jwt.verify() throws synchronously on an expired/invalid/tampered token —
  // that's the most important case for this endpoint (it means the session
  // can't be salvaged, the client must log in again), so it has to be caught
  // explicitly instead of crashing the route with an unhandled exception.
  let user_id: string;
  try {
    const decoded = verifyToken(refresh_token) as JwtPayload;
    // signToken() always signs an object in this codebase, so `decoded`
    // should never actually be a string — but a malformed/forged token could
    // still be missing `user_id`, so both cases are rejected the same way.
    user_id = decoded.user_id;
  } catch {
    cookieStore.delete("token");
    cookieStore.delete("refresh_token");
    return toHttpResponse({
      ok: false,
      error: "Invalid or expired refresh token",
      code: "UNAUTHORIZED",
    });
  }

  // Second check, against the DB: a valid signature isn't enough on its own —
  // the token must also match a session that hasn't already been rotated out
  // or expired. Filtering by hash (not just user_id) finds the *specific*
  // session this token belongs to, since a user can have more than one
  // active session at a time (multiple devices/browsers).
  const tokenHash = hashToken(refresh_token);
  const session = await getUserSession(user_id, tokenHash);
  if (!session.ok) return toHttpResponse(session);

  const user = session.data;

  // Reaching this point means the refresh token is valid — which is exactly
  // why the client called this endpoint (its access token had expired). So a
  // new access token is always issued here, not only in some conditional case.
  const access = await createAccessToken(user);
  if (!access.ok) return toHttpResponse(access);

  // Rotate the refresh token: the session matching `tokenHash` is deleted in
  // the same statement that inserts the new one (see createRefreshToken), so
  // this exact refresh token can never be exchanged a second time. If it's
  // ever replayed later (e.g. it was stolen), the lookup above will fail
  // because that row is already gone.
  const refresh = await createRefreshToken(user_id, tokenHash);
  if (!refresh.ok) return toHttpResponse(refresh);

  return toHttpResponse({ ok: true, data: { rotated: true } });
}
