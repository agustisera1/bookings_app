import * as db from "../postgres";
import type { User } from "../types/user";

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db.query<User>(
    `SELECT * FROM users WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await db.query<User>(
    `SELECT * FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  name: string,
): Promise<{ id: string; email: string }> {
  const result = await db.query<{ id: string; email: string }>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email`,
    [email, passwordHash, name],
  );
  return result.rows[0];
}
