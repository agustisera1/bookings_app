import type { Role } from "../permissions";

export type User = {
  id: string;
  email: string;
  name: string;
  is_host: boolean;
  created_at: string;
  password_hash: string;
};

// Fields a session/JWT needs — password_hash never travels past this layer.
export type PublicUser = Pick<User, "id" | "email" | "name" | "is_host">;

// A user as a *counterparty* may see them. Narrower than `PublicUser`, which
// carries the email because it models the session's own account.
export type UserSummary = Pick<User, "id" | "name">;

export type SessionRecord = PublicUser;

// What a decoded access token carries (see createAccessToken's payload).
export type CurrentUser = PublicUser & {
  permissions: string[];
  roles: Role[];
};
