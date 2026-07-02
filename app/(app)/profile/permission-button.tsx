"use client";

import { useTransition } from "react";
import { authorize } from "@/lib/authorize";
import { Button } from "@/components/ui/button";

type Props = {
  permissionKey: string;
};

export function PermissionButton({ permissionKey }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await authorize(permissionKey);
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
