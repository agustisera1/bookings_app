"use server";
import * as db from "../db";
import { hash, compare } from "bcryptjs";
import { DatabaseError } from "pg";
import type { ServiceResponse } from "../types";

const SALT_ROUNDS = 10;

export type User = {
  id: string;
  email: string;
  name: string;
  is_host: boolean;
  is_admin: boolean;
  created_at: string;
};

export async function createUser(
  formData: FormData,
): Promise<ServiceResponse<Pick<User, "id" | "email">>> {
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");

  if (!email || !password || !name)
    return { status: 400, data: null, error: "All fields are required" };
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string"
  )
    return { status: 400, data: null, error: "Invalid field types" };
  if (password.length < 8)
    return {
      status: 400,
      data: null,
      error: "Password must be at least 8 characters",
    };

  const password_hash = await hash(password, SALT_ROUNDS);

  try {
    const result = await db.query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email`,
      [email, password_hash, name],
    );
    return { status: 201, data: result.rows[0], error: null };
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505")
      return {
        status: 409,
        data: null,
        error: "An account with that email already exists",
      };
    return { status: 500, data: null, error: "Unexpected error" };
  }
}

export async function authUser(
  formData: FormData,
): Promise<ServiceResponse<User>> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    !email ||
    !password ||
    typeof email !== "string" ||
    typeof password !== "string"
  )
    return { status: 400, data: null, error: "All fields are required" };

  try {
    const result = await db.query<User & { password_hash: string }>(
      `SELECT * FROM users WHERE email = $1`,
      [email],
    );

    if (!result.rowCount)
      return { status: 401, data: null, error: "Invalid email or password" };

    const user = result.rows[0];
    const valid = await compare(password, user.password_hash);

    if (!valid)
      return { status: 401, data: null, error: "Invalid email or password" };

    const { password_hash: _, ...safeUser } = user;
    return { status: 200, data: safeUser, error: null };
  } catch {
    return { status: 500, data: null, error: "Unexpected error" };
  }
}
