import { getCurrentUser } from "@/lib/services/auth";
import { forbidden } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user?.is_host) forbidden();

  return (
    <div className="p-10 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">My listings</h1>
        <Button nativeButton={false} render={<Link href="/listings/new" />}>
          <Plus />
          Create listing
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
