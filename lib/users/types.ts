import type { users } from "./tables";

export type User = typeof users.$inferSelect;

export type NewUser = Pick<typeof users.$inferInsert, "email" | "password_hash" | "name">;

// Fields a session/JWT needs — password_hash never travels past this layer.
export type PublicUser = Pick<User, "id" | "email" | "name" | "is_host">;

// A user as a *counterparty* may see them: no email.
export type UserSummary = Pick<User, "id" | "name">;
