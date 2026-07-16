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

export type SessionRecord = PublicUser;

// What a decoded access token carries (see createAccessToken's payload).
export type CurrentUser = PublicUser & {
  permissions: string[];
  roles: Role[];
};
