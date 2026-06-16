"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";

export async function accessAdminPanel(): Promise<ServiceResult> {
  const auth = await authorize("admin:panel");
  if (!auth.ok) return auth;
  console.log("[accessAdminPanel]: invocado");
  return { ok: true, data: null };
}

export async function moderateContent(): Promise<ServiceResult> {
  const auth = await authorize("admin:moderate-content");
  if (!auth.ok) return auth;
  console.log("[moderateContent]: invocado");
  return { ok: true, data: null };
}

export async function manageDisputes(): Promise<ServiceResult> {
  const auth = await authorize("admin:manage-disputes");
  if (!auth.ok) return auth;
  console.log("[manageDisputes]: invocado");
  return { ok: true, data: null };
}

export async function getGlobalMetrics(): Promise<ServiceResult> {
  const auth = await authorize("admin:global-metrics");
  if (!auth.ok) return auth;
  console.log("[getGlobalMetrics]: invocado");
  return { ok: true, data: null };
}
