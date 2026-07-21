"use client";
import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteError } from "@/components/common/route-error";

export default function MessagesError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      icon={<MessageSquareWarning />}
      title="This conversation didn't load"
      description="The messaging service didn't respond. Try again, or go back to your inbox."
      reset={reset}
      homeAction={
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/messages" />}
        >
          Back to messages
        </Button>
      }
    />
  );
}
