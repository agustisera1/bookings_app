"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";

export async function createReview(): Promise<ServiceResult> {
  const auth = await authorize("reviews:create");
  if (!auth.ok) return auth;
  console.log("[createReview]: invocado");
  return { ok: true, data: null };
}

export async function replyToReview(): Promise<ServiceResult> {
  const auth = await authorize("reviews:reply");
  if (!auth.ok) return auth;
  console.log("[replyToReview]: invocado");
  return { ok: true, data: null };
}
