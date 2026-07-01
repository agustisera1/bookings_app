"use client";

import { useTransition } from "react";
import type { ServiceResult } from "@/lib/types";
import { Button } from "@/components/ui/button";

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
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs"
    >
      Check permission
    </Button>
  );
}
