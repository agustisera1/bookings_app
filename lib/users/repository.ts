import { eq } from "drizzle-orm";
import { db } from "@/lib/infra/postgres";
import { insertOutboxEvent } from "@/lib/outbox/repository";
import type { OutboxEvent } from "@/lib/outbox/types";
import { users } from "./tables";
import type { NewUser, User } from "./types";

export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function insertUser(
  user: NewUser,
  event: OutboxEvent,
): Promise<Pick<User, "id" | "email">> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values(user)
      .returning({ id: users.id, email: users.email });
    await insertOutboxEvent(tx, { type: "user", id: created.id }, event);
    return created;
  });
}
