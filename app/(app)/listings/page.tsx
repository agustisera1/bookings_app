import { Listings } from "@/components/listings/listings";
import { Search } from "@/components/search/search";
import { PageLayout } from "@/components/common/page-layout";
import { EmptyState } from "@/components/common/empty-state";
import { GetListingsDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
import { SearchX } from "lucide-react";
import { Suspense } from "react";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q: string }>;
}) {
  const { q } = await searchParams;
  const {
    data: { listings },
    error,
  } = await query({
    query: GetListingsDocument,
    variables: { filters: { limit: 10, term: q } },
  });

  return (
    <PageLayout
      title="Explore listings"
      subtitle="Find your next stay, experience, or gear to rent."
      toolbar={
        <Suspense>
          <Search />
        </Suspense>
      }
    >
      {error ? (
        <p className="text-sm text-muted-foreground">
          Could not load listings. Please try again.
        </p>
      ) : listings && listings.length > 0 ? (
        <Listings listings={listings} />
      ) : (
        <EmptyState
          className="py-16"
          icon={<SearchX />}
          title="No listings found"
          description={
            q
              ? `Nothing matched “${q}”. Try a different search.`
              : "There are no listings to show yet."
          }
        />
      )}
    </PageLayout>
  );
}
