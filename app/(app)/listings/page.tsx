import type { Metadata } from "next";
import { Listings } from "@/components/listings/listings";
import { Search } from "@/components/search/search";
import { PageLayout } from "@/components/common/page-layout";
import { EmptyState } from "@/components/common/empty-state";
import { GetListingsDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
import { SearchX } from "lucide-react";
import { Suspense } from "react";
import { parseListingFilters, type ListingSearchParams } from "@/lib/listings";

export const metadata: Metadata = { title: "Explore listings" };

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = await searchParams;
  const hasFilters = Object.keys(params).length > 0;
  const filters = parseListingFilters(params);

  const {
    data: { listings },
    error,
  } = await query({
    query: GetListingsDocument,
    variables: {
      filters,
    },
  });

  return (
    <PageLayout
      title="Explore listings"
      subtitle="Find your next stay, experience, or gear to rent."
      inlineToolbar
      toolbar={
        <Suspense>
          <Search />
        </Suspense>
      }
    >
      {error ? (
        <p className="text-sm text-muted-foreground">
          Could not load listings. Try reloading the page.
        </p>
      ) : listings && listings.length > 0 ? (
        <Listings listings={listings} />
      ) : (
        <EmptyState
          className="py-16"
          icon={<SearchX />}
          title={hasFilters ? "No listings match your filters" : "No listings yet"}
          description={
            hasFilters
              ? "Try adjusting or clearing the filters to see more listings."
              : "There are no listings to show yet."
          }
        />
      )}
    </PageLayout>
  );
}
