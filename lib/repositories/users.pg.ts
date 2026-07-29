import * as db from "../postgres";
import type { User } from "../types/user";
import type { OutboxEvent } from "../types/outbox";

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
  event: OutboxEvent,
): Promise<{ id: string; email: string }> {
  const result = await db.query<{ id: string; email: string }>(
    `WITH new_user AS (
       INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email
     ), outbox_event AS (
       INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       SELECT 'user', new_user.id::text, $4, $5::jsonb
       FROM new_user
     )
     SELECT id, email FROM new_user`,
    [email, passwordHash, name, event.type, event.payload ?? {}],
  );
  return result.rows[0];
}
