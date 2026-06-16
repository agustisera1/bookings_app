"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";

export async function searchListings(): Promise<ServiceResult> {
  const auth = await authorize("listings:search");
  if (!auth.ok) return auth;
  console.log("[searchListings]: invocado");
  return { ok: true, data: null };
}

export async function viewListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:view");
  if (!auth.ok) return auth;
  console.log("[viewListing]: invocado");
  return { ok: true, data: null };
}

export async function createListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:create");
  if (!auth.ok) return auth;
  console.log("[createListing]: invocado");
  return { ok: true, data: null };
}

export async function manageListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:manage-own");
  if (!auth.ok) return auth;
  console.log("[manageListing]: invocado");
  return { ok: true, data: null };
}

export async function createExtendedListing(): Promise<ServiceResult> {
  const auth = await authorize("listings:create-extended");
  if (!auth.ok) return auth;
  console.log("[createExtendedListing]: invocado");
  return { ok: true, data: null };
}
