import { getCurrentUser } from "@/lib/services/auth";
import { forbidden } from "next/navigation";
import Link from "next/link";
import { Plus, SearchX } from "lucide-react";
import { Suspense } from "react";
import { query } from "@/lib/apollo/client";
import { GetListingsDocument } from "@/lib/apollo/__generated__/operations";
import { parseListingFilters, type ListingSearchParams } from "@/lib/listings";
import { Listings } from "@/components/listings/listings";
import { Search } from "@/components/search/search";
import { PageLayout } from "@/components/common/page-layout";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user?.is_host) forbidden();

  const params = await searchParams;
  const hasFilters = Object.keys(params).length > 0;
  const {
    data: { listings },
    error,
  } = await query({
    query: GetListingsDocument,
    variables: { filters: { ...parseListingFilters(params), own: true } },
  });

  return (
    <PageLayout
      title="My listings"
      subtitle="Manage the places, experiences, and gear you host."
      inlineToolbar
      toolbar={
        <Suspense>
          <Search />
        </Suspense>
      }
    >
      {error ? (
        <p className="text-sm text-muted-foreground">
          Could not load your listings. Please try again.
        </p>
      ) : listings && listings.length > 0 ? (
        <Listings listings={listings} />
      ) : hasFilters ? (
        <EmptyState
          className="py-16"
          icon={<SearchX />}
          title="No listings match your filters"
          description="Try adjusting or clearing the filters to see more of your listings."
        />
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
