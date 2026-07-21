import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center p-10">
      <EmptyState
        icon={<Compass />}
        title="We can't find that page"
        description="The link may be broken, or the listing or booking it pointed to no longer exists."
        action={
          <Button
            className="mt-2"
            nativeButton={false}
            render={<Link href="/listings" />}
          >
            Browse listings
          </Button>
        }
      />
    </div>
  );
}
