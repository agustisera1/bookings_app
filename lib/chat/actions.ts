"use server";
import { authorize } from "@/lib/auth/session";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";

// Moves the read cursor to now: everything before it counts as seen.
export async function markMessagesAsSeen(): Promise<ServiceResult<null>> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;

  try {
    await repo.upsertReadCursor(auth.data.id, new Date().toISOString());
    return { ok: true, data: null };
  } catch (error) {
    console.error("[markMessagesAsSeen]", error);
    return { ok: false, error: "Could not update your messages", code: "UNEXPECTED" };
  }
}
