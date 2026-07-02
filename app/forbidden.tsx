"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <h2 className="text-2xl font-semibold tracking-tight">403 — Forbidden</h2>
      <p className="text-sm text-muted-foreground">
        You don&apos;t have permission to access this resource.
      </p>
      <Button nativeButton={false} render={<Link href="/" />}>
        Return home
      </Button>
    </div>
  );
}
