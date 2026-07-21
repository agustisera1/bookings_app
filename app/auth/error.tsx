"use client";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteError } from "@/components/common/route-error";

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      icon={<TriangleAlert />}
      title="Something interrupted that"
      description="We couldn't complete your request. Try again to pick up where you left off."
      reset={reset}
      homeAction={
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/auth/sign-in" />}
        >
          Back to sign in
        </Button>
      }
    />
  );
}
