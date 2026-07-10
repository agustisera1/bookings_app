import { getCurrentUser } from "@/lib/services/auth";
import { forbidden } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { query } from "@/lib/apollo/client";
import { GetListingsDocument } from "@/lib/apollo/__generated__/operations";
import { ListingsGrid } from "@/components/listings/listings-grid";
import { PageLayout } from "@/components/common/page-layout";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user?.is_host) forbidden();

  const {
    data: { listings },
    error,
  } = await query({
    query: GetListingsDocument,
    variables: { filters: { own: true } },
  });

  return (
    <PageLayout
      title="My listings"
      subtitle="Manage the places, experiences, and gear you host."
      actions={
        <Button nativeButton={false} render={<Link href="/listings/new" />}>
          <Plus />
          New listing
        </Button>
      }
    >
      {error ? (
        <p className="text-sm text-muted-foreground">
          Could not load your listings. Please try again.
        </p>
      ) : listings && listings.length > 0 ? (
        <ListingsGrid listings={listings} />
      ) : (
        <EmptyState
          className="py-16"
          icon={<Plus />}
          title="No listings yet"
          description="Publish your first listing to start hosting."
          action={
            <Button
              className="mt-2"
              nativeButton={false}
              render={<Link href="/listings/new" />}
            >
              Add new listing
            </Button>
          }
        />
      )}
    </PageLayout>
  );
}
