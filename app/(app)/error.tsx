"use client";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteError } from "@/components/common/route-error";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      icon={<TriangleAlert />}
      title="This page didn't load"
      description="An unexpected error interrupted it. Try again — if it keeps happening, head home and come back later."
      reset={reset}
      homeAction={
        <Button nativeButton={false} render={<Link href="/" />}>
          Go home
        </Button>
      }
    />
  );
}
