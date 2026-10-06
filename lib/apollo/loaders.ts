import DataLoader from "dataloader";
import type { ServiceResult } from "@/lib/shared/result";
import { toGraphQLError } from "./errors";

export function groupedLoader<T>(
  load: (keys: string[]) => Promise<ServiceResult<T[]>>,
  keyOf: (row: T) => string,
) {
  return new DataLoader<string, T[]>(async (keys) => {
    const result = await load([...keys]);
    if (!result.ok) return keys.map(() => toGraphQLError(result));

    const groups = new Map<string, T[]>();
    for (const row of result.data) {
      const group = groups.get(keyOf(row));
      if (group) group.push(row);
      else groups.set(keyOf(row), [row]);
    }
    return keys.map((key) => groups.get(key) ?? []);
  });
}

export function keyedLoader<T>(
  load: (keys: string[]) => Promise<ServiceResult<T[]>>,
  keyOf: (row: T) => string,
) {
  return new DataLoader<string, T | null>(async (keys) => {
    const result = await load([...keys]);
    if (!result.ok) return keys.map(() => toGraphQLError(result));

    const byKey = new Map(result.data.map((row) => [keyOf(row), row]));
    return keys.map((key) => byKey.get(key) ?? null);
  });
}
