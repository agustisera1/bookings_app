"use client";
import { useTransition } from "react";
import type { ServiceResult } from "@/lib/types";

type Props = {
  action: () => Promise<ServiceResult>;
  permissionKey: string;
};

export function PermissionButton({ action, permissionKey }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        alert(`[${permissionKey}]: invocado`);
      } else {
        alert(`[denied]: ${result.error}`);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 transition-colors cursor-pointer"
    >
      Check permission
    </button>
  );
}
