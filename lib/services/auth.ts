"use server";
import * as db from "../db";
import { hash, compare } from "bcryptjs";
import { DatabaseError } from "pg";
import type { ServiceResult } from "../types";
import { hashToken, signToken } from "../jwt";
import { cookies } from "next/headers";
import {
  formDataToObject,
  signInSchema,
  signUpSchema,
} from "../validation/auth";

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

// Only the fields a session/JWT actually needs — password_hash never travels past this layer.
export type SessionRecord = Pick<
  User,
  "id" | "email" | "is_admin" | "is_host"
> & {
  // Informational only — validity is already enforced by the `expires_at > NOW()`
  // filter inside getUserSession's query, so callers don't need to re-check this.
  expires_at: string;
};

export async function createAccessToken(
  user: Pick<User, "id" | "email" | "is_admin" | "is_host">,
): Promise<ServiceResult<{ token: string }>> {
  try {
    const token = signToken(
      {
        user_id: user.id,
        email: user.email,
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
    // Logged with full detail server-side; callers only need to know it failed
    // so they can stop and report it instead of pretending login succeeded.
    console.error("[createAccessToken]", error);
    return {
      ok: false,
      error: "Failed to create access token",
      code: "UNEXPECTED",
    };
  }
}

/**
 * Issues a new refresh token and persists its hash as a session row.
 *
 * Pass `oldTokenHash` when this is called as part of rotation (i.e. from the
 * /api/auth/refresh flow): the old session row is deleted in the SAME
 * statement that inserts the new one, so the refresh token that was just
 * used can never be exchanged again afterwards. That's what makes reuse of a
 * stolen refresh token detectable later — once rotated, its hash simply
 * won't match any row anymore, so getUserSession() will reject it.
 */
export async function createRefreshToken(
  user_id: string,
  oldTokenHash?: string,
): Promise<ServiceResult<{ token: string }>> {
  try {
    const token = signToken({ user_id }, { expiresIn: "720h" });
    const hashed = hashToken(token);

    if (oldTokenHash) {
      // A single statement (via a data-modifying CTE) keeps the delete+insert
      // atomic — there's no window where both rows or neither row exists.
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

/**
 * Looks up the exact session matching (userId, tokenHash) and confirms it
 * hasn't expired. Filtering by hash — not just userId — matters because a
 * user can have several active sessions (multiple devices/browsers); without
 * it, this could match an unrelated session instead of the one the caller
 * actually presented a refresh token for.
 */
export async function getUserSession(
  userId: string,
  tokenHash: string,
): Promise<ServiceResult<SessionRecord>> {
  try {
    const result = await db.query<SessionRecord>(
      `SELECT u.id, u.email, u.is_admin, u.is_host, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1 AND s.token_hash = $2 AND s.expires_at > NOW()`,
      [userId, tokenHash],
    );

    // No row = the hash doesn't match, the session expired, or it was already
    // rotated out by an earlier refresh. We don't distinguish which one to
    // the caller — all three mean the same thing: log in again.
    if (result.rowCount === 0)
      return {
        ok: false,
        error: "Invalid or expired session",
        code: "UNAUTHORIZED",
      };

    return { ok: true, data: result.rows[0] };
  } catch (error) {
    // Never forward raw DB error messages to the client — they can leak
    // table/column/constraint names. Log the detail, return a generic one.
    console.error("[getUserSession]", error);
    return { ok: false, error: "Unexpected error", code: "UNEXPECTED" };
  }
}

export async function createUser(
  formData: FormData,
): Promise<ServiceResult<Pick<User, "id" | "email">>> {
  // The form already validates this shape before submitting, but a Server
  // Action is a public endpoint by nature (callable directly, not just from
  // this form) — so the service layer re-validates from scratch and never
  // trusts the client.
  const parsed = signUpSchema.safeParse(formDataToObject(formData));
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION",
    };

  const { email, password, name } = parsed.data;
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
  const parsed = signInSchema.safeParse(formDataToObject(formData));
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION",
    };

  const { email, password } = parsed.data;

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

    // Both must succeed for the login to actually be usable. If either
    // fails, bail out and report it instead of returning ok with a
    // half-set session (e.g. a cookie with no matching DB row, or a DB row
    // with no cookie to go with it).
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
