import type { Role } from "@/lib/auth/policy";
import type { PublicUser } from "@/lib/users/types";

// What a decoded access token carries (see createAccessToken's payload).
export type CurrentUser = PublicUser & {
  permissions: string[];
  roles: Role[];
};
