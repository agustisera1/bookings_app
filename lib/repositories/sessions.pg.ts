import * as db from "../postgres";
import type { SessionRecord } from "../types/user";

export async function findValidSession(
  userId: string,
  tokenHash: string,
): Promise<SessionRecord | null> {
  const result = await db.query<SessionRecord>(
    `SELECT u.id, u.email, u.name, u.is_host, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1 AND s.token_hash = $2 AND s.expires_at > NOW()`,
    [userId, tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function createSession(
  userId: string,
  tokenHash: string,
): Promise<void> {
  await db.query(
    `INSERT INTO sessions (user_id, token_hash) VALUES ($1, $2)`,
    [userId, tokenHash],
  );
}

// CTE keeps delete+insert atomic — no window with both or neither row.
export async function rotateSession(
  oldTokenHash: string,
  userId: string,
  newTokenHash: string,
): Promise<void> {
  await db.query(
    `WITH deleted AS (
       DELETE FROM sessions WHERE token_hash = $1
     )
     INSERT INTO sessions (user_id, token_hash) VALUES ($2, $3)`,
    [oldTokenHash, userId, newTokenHash],
  );
}

export async function deleteSessionsByUser(userId: string): Promise<number> {
  const result = await db.query(
    `DELETE FROM sessions WHERE user_id = $1`,
    [userId],
  );
  return result.rowCount ?? 0;
}
