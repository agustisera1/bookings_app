import { revalidatePath } from "next/cache";

export type RevalidationTarget = {
  path: string;
  level?: Parameters<typeof revalidatePath>[1];
};

export function revalidatePaths(targets: RevalidationTarget[]) {
  for (const { path, level } of targets) revalidatePath(path, level);
}
