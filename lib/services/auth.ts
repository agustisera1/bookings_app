"use server";
import * as db from "../db";
import { hash, compare } from "bcryptjs";
import { DatabaseError } from "pg";
import type { ServiceResult } from "../types";
import { hashToken, signToken, verifyToken } from "../jwt";
import { cookies } from "next/headers";
import {
  formDataToObject,
  signInSchema,
  signUpSchema,
} from "../validation/auth";
import { JwtPayload } from "jsonwebtoken";

const SALT_ROUNDS = 10;

export type User = {
  id: string;
  email: string;
  name: string;
  is_host: boolean;
  is_admin: boolean;
  created_at: string;
  password_hash: string;
};

// Fields a session/JWT needs — password_hash never travels past this layer.
export type PublicUser = Pick<User, "id" | "email" | "name" | "is_admin" | "is_host">;

export type SessionRecord = PublicUser;

// What a decoded access token carries (see createAccessToken's payload).
export type CurrentUser = PublicUser;

export async function createAccessToken(
  user: PublicUser,
): Promise<ServiceResult<{ token: string }>> {
  try {
    const token = signToken(
      {
        user_id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        is_host: user.is_host,
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
      // CTE keeps delete+insert atomic — no window with both or neither row.
      await db.query(
        `WITH deleted AS (
           DELETE FROM sessions WHERE token_hash = $1
         )
         INSERT INTO sessions (user_id, token_hash) VALUES ($2, $3)`,
        [oldTokenHash, user_id, hashed],
      );
    } else {
      await db.query(
        `INSERT INTO sessions (user_id, token_hash) VALUES ($1, $2)`,
        [user_id, hashed],
      );
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
    const result = await db.query<SessionRecord>(
      `SELECT u.id, u.email, u.name, u.is_admin, u.is_host, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1 AND s.token_hash = $2 AND s.expires_at > NOW()`,
      [userId, tokenHash],
    );

    // No row = bad hash, expired, or already rotated out — all mean the same
    // thing to the caller: log in again, so we don't distinguish between them.
    if (result.rowCount === 0)
      return {
        ok: false,
        error: "Invalid or expired session",
        code: "UNAUTHORIZED",
      };

    return { ok: true, data: result.rows[0] };
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
    const result = await db.query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email`,
      [email, password_hash, name],
    );
    return { ok: true, data: result.rows[0] };
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505")
      return {
        ok: false,
        error: "An account with that email already exists",
        code: "CONFLICT",
      };
    console.error("[createUser]", error);
    return { ok: false, error: "Unexpected error", code: "UNEXPECTED" };
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
    const result = await db.query<User>(
      `SELECT * FROM users WHERE email = $1`,
      [email],
    );

    if (!result.rowCount)
      return {
        ok: false,
        error: "Invalid email or password",
        code: "UNAUTHORIZED",
      };

    const user = result.rows[0];
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
    const result = await db.query(`DELETE FROM sessions WHERE user_id = $1`, [
      user_id,
    ]);

    if (result.rowCount === 0) throw new Error();
    if (cookieStore.has("refresh_token")) cookieStore.delete("refresh_token");
    cookieStore.delete("token");

    return {
      ok: true,
      data: null,
    };
  } catch {
    return {
      ok: false,
      error: "Something happened while removing the user session",
      code: "UNEXPECTED",
    };
  }
}
