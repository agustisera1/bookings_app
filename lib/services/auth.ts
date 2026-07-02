"use server";
import * as db from "../postgres";
import { hash, compare } from "bcryptjs";
import type { ServiceResult } from "../types";
import { hashToken, signToken, verifyToken } from "../jwt";
import { cookies } from "next/headers";
import {
  formDataToObject,
  signInSchema,
  signUpSchema,
} from "../validation/auth";
import { JwtPayload } from "jsonwebtoken";
import { getPermissionsForRoles, getUserRoles } from "../permissions";
import * as usersRepo from "../repositories/users.pg";
import * as sessionsRepo from "../repositories/sessions.pg";

export type { User, PublicUser, SessionRecord, CurrentUser } from "../types/user";
import type { User, PublicUser, CurrentUser, SessionRecord } from "../types/user";

const SALT_ROUNDS = 10;

export async function createAccessToken(
  user: PublicUser,
): Promise<ServiceResult<{ token: string }>> {
  try {
    const roles = getUserRoles(user);
    const permissions = getPermissionsForRoles(roles);
    const token = signToken(
      {
        user_id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        is_host: user.is_host,
        roles,
        permissions: permissions.map(({ key }) => key),
      },
      { expiresIn: "1h" },
    );

    (await cookies()).set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60,
      path: "/",
    });

    return { ok: true, data: { token } };
  } catch (error) {
    // Full detail stays server-side; callers only need to know it failed.
    console.error("[createAccessToken]", error);
    return {
      ok: false,
      error: "Failed to create access token",
      code: "UNEXPECTED",
    };
  }
}

// Issues a refresh token and persists its hash as a session row. Pass
// `oldTokenHash` during rotation (/api/auth/refresh): the old row is deleted
// in the same statement that inserts the new one, so a reused/stolen token
// can't be exchanged twice — getUserSession() will simply find no match.
export async function createRefreshToken(
  user_id: string,
  oldTokenHash?: string,
): Promise<ServiceResult<{ token: string }>> {
  try {
    const token = signToken({ user_id }, { expiresIn: "720h" });
    const hashed = hashToken(token);

    if (oldTokenHash) {
      await sessionsRepo.rotateSession(oldTokenHash, user_id, hashed);
    } else {
      await sessionsRepo.createSession(user_id, hashed);
    }

    (await cookies()).set("refresh_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
      path: "/api/auth/refresh",
    });

    return { ok: true, data: { token } };
  } catch (error) {
    console.error("[createRefreshToken]", error);
    return {
      ok: false,
      error: "Failed to create refresh token",
      code: "UNEXPECTED",
    };
  }
}

// Looks up the session matching (userId, tokenHash) and confirms it hasn't
// expired. Filtering by hash (not just userId) matters since a user can have
// several active sessions — it pins down the one the caller's token is for.
export async function getUserSession(
  userId: string,
  tokenHash: string,
): Promise<ServiceResult<SessionRecord>> {
  try {
    const session = await sessionsRepo.findValidSession(userId, tokenHash);

    // No row = bad hash, expired, or already rotated out — all mean the same
    // thing to the caller: log in again, so we don't distinguish between them.
    if (!session)
      return {
        ok: false,
        error: "Invalid or expired session",
        code: "UNAUTHORIZED",
      };

    return { ok: true, data: session };
  } catch (error) {
    // Never forward raw DB error messages — they can leak schema details.
    console.error("[getUserSession]", error);
    return { ok: false, error: "Unexpected error", code: "UNEXPECTED" };
  }
}

export async function createUser(
  formData: FormData,
): Promise<ServiceResult<Pick<User, "id" | "email">>> {
  // A Server Action is callable directly, not just from this form, so the
  // service layer re-validates from scratch rather than trusting the client.
  const { success, error, data } = signUpSchema.safeParse(
    formDataToObject(formData),
  );

  if (!success)
    return {
      ok: false,
      error: error.issues[0].message,
      code: "VALIDATION",
    };

  const { email, password, name } = data;
  const password_hash = await hash(password, SALT_ROUNDS);

  try {
    const user = await usersRepo.createUser(email, password_hash, name);
    return { ok: true, data: user };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    if (code === "CONFLICT")
      return {
        ok: false,
        error: "An account with that email already exists",
        code,
      };
    console.error("[createUser]", error);
    return { ok: false, error: "Could not create your account", code };
  }
}

export async function authUser(
  formData: FormData,
): Promise<ServiceResult<Omit<User, "password_hash">>> {
  const { success, error, data } = signInSchema.safeParse(
    formDataToObject(formData),
  );
  if (!success)
    return {
      ok: false,
      error: error.issues[0].message,
      code: "VALIDATION",
    };

  const { email, password } = data;

  try {
    const user = await usersRepo.findUserByEmail(email);

    if (!user)
      return {
        ok: false,
        error: "Invalid email or password",
        code: "UNAUTHORIZED",
      };

    const valid = await compare(password, user.password_hash);

    if (!valid)
      return {
        ok: false,
        error: "Invalid email or password",
        code: "UNAUTHORIZED",
      };

    // Both must succeed, or the session ends up half-set (cookie without a
    // matching DB row, or vice versa) — bail out and report it instead.
    const access = await createAccessToken(user);
    if (!access.ok) return access;

    const refresh = await createRefreshToken(user.id);
    if (!refresh.ok) return refresh;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...safeUser } = user;
    return { ok: true, data: safeUser };
  } catch (error) {
    console.error("[authUser]", error);
    return { ok: false, error: "Unexpected error", code: "UNEXPECTED" };
  }
}

// Decodes the access token cookie without hitting the DB — proxy.ts already
// rejects missing/invalid tokens before a page renders. Returns null instead
// of throwing in case it expired between that check and this call.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    const decoded = verifyToken(token) as JwtPayload;
    return {
      id: decoded.user_id,
      email: decoded.email,
      name: decoded.name,
      is_host: decoded.is_host,
      is_admin: decoded.is_admin,
      roles: decoded.roles,
      permissions: decoded.permissions,
    };
  } catch {
    return null;
  }
}

//** WARNING: This is removing all the sessions rather than a specific session. Refactor this fn to handle
// token hash for finding the right row to delete from the sessions table */
export async function logoutUser(): Promise<ServiceResult> {
  const cookieStore = await cookies();
  try {
    const token = cookieStore.get("token")?.value;
    const { user_id } = verifyToken(token!) as JwtPayload;
    const deletedCount = await sessionsRepo.deleteSessionsByUser(user_id);

    if (deletedCount === 0) throw new Error();
    if (cookieStore.has("refresh_token")) cookieStore.delete("refresh_token");
    cookieStore.delete("token");

    return { ok: true, data: null };
  } catch (error) {
    console.error("[logoutUser]", error);
    return {
      ok: false,
      error: "Something happened while removing the user session",
      code: "UNEXPECTED",
    };
  }
}
