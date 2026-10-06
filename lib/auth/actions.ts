"use server";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { signToken } from "@/lib/infra/jwt";
import { pgErrorToCode } from "@/lib/infra/postgres";
import { rateLimit, resetRateLimit, type RateLimitPolicy } from "@/lib/infra/rate-limit";
import { getClientIp } from "@/lib/infra/request";
import type { ServiceResult } from "@/lib/shared/result";
import * as usersRepo from "@/lib/users/repository";
import type { PublicUser, User } from "@/lib/users/types";
import { getPermissionsForRoles, getUserRoles } from "./policy";
import { authorize } from "./session";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "./validation";

const SALT_ROUNDS = 10;

// Cotas de abuso. Ver docs/architecture/RATE_LIMITING.md.
const LOGIN_IP_POLICY: RateLimitPolicy = { limit: 10, windowMs: 10 * 60_000, failMode: "open" };
const LOGIN_EMAIL_POLICY: RateLimitPolicy = { limit: 5, windowMs: 10 * 60_000, failMode: "open" };
const SIGNUP_IP_POLICY: RateLimitPolicy = { limit: 5, windowMs: 60 * 60_000, failMode: "closed" };

const TOO_MANY_ATTEMPTS = "Too many attempts. Please try again later.";

// Not exported: from a "use server" file it would become a callable action.
async function setAccessToken(user: PublicUser): Promise<void> {
  const roles = getUserRoles(user);
  const token = signToken(
    {
      user_id: user.id,
      email: user.email,
      name: user.name,
      is_host: user.is_host,
      roles,
      permissions: getPermissionsForRoles(roles).map(({ key }) => key),
    },
    { expiresIn: "24h" },
  );

  (await cookies()).set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function createUser(
  input: SignUpInput,
): Promise<ServiceResult<Pick<User, "id" | "email">>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  // Before bcrypt and the welcome mail: a bot burns neither CPU nor the Resend quota.
  const ip = await getClientIp();
  const limit = await rateLimit(`rl:signup:ip:${ip}`, SIGNUP_IP_POLICY);
  if (!limit.allowed) return { ok: false, error: TOO_MANY_ATTEMPTS, code: "RATE_LIMITED" };

  const { email, password, name } = parsed.data;
  const password_hash = await hash(password, SALT_ROUNDS);

  try {
    const user = await usersRepo.insertUser(
      { email, password_hash, name },
      { type: "user.registered" },
    );
    return { ok: true, data: user };
  } catch (error) {
    const code = pgErrorToCode(error);
    if (code === "CONFLICT")
      return { ok: false, error: "An account with that email already exists", code };
    console.error("[createUser]", error);
    return { ok: false, error: "Could not create your account", code: "UNEXPECTED" };
  }
}

export async function authUser(
  input: SignInInput,
): Promise<ServiceResult<Omit<User, "password_hash">>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  const { email, password } = parsed.data;
  const ip = await getClientIp();
  const ipKey = `rl:login:ip:${ip}`;
  const emailKey = `rl:login:email:${email.toLowerCase()}`;

  // Before the lookup, so the message is identical whether the email exists or not
  // (otherwise the limit becomes an account-enumeration oracle).
  const [ipLimit, emailLimit] = await Promise.all([
    rateLimit(ipKey, LOGIN_IP_POLICY),
    rateLimit(emailKey, LOGIN_EMAIL_POLICY),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed)
    return { ok: false, error: TOO_MANY_ATTEMPTS, code: "RATE_LIMITED" };

  try {
    const user = await usersRepo.findUserByEmail(email);
    if (!user || !(await compare(password, user.password_hash)))
      return { ok: false, error: "Invalid email or password", code: "UNAUTHORIZED" };

    await setAccessToken(user);
    // Login OK: only failed attempts should count.
    await resetRateLimit(ipKey, emailKey);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...safeUser } = user;
    return { ok: true, data: safeUser };
  } catch (error) {
    console.error("[authUser]", error);
    return { ok: false, error: "Unexpected error", code: "UNEXPECTED" };
  }
}

export async function logoutUser(): Promise<ServiceResult<null>> {
  (await cookies()).delete("token");
  return { ok: true, data: null };
}

// Short-lived credential for the socket handshake: the client can't read the
// httpOnly cookie, and handing it the access token would park it in JS.
export async function getUserToken(): Promise<ServiceResult<string>> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;
  const user = auth.data;

  return {
    ok: true,
    data: signToken(
      {
        user_id: user.id,
        email: user.email,
        name: user.name,
        is_host: user.is_host,
        roles: user.roles,
        permissions: user.permissions,
      },
      { expiresIn: "5m" },
    ),
  };
}
