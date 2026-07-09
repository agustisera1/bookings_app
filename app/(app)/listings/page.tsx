import { Listings } from "@/components/listings/listings";
import { Search } from "@/components/search/search";
import { PageLayout } from "@/components/common/page-layout";
import { EmptyState } from "@/components/common/empty-state";
import { GetListingsDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
import { SearchX } from "lucide-react";
import { Suspense } from "react";
import { GetListingFilters } from "@/lib/types/listing";

type SearchParams = {
  own?: boolean;
  limit?: number;
  type?: string;
  term?: string;
  location?: string;
  rating?: number;
  availabilityRange?: string;
  priceRange?: string;
  propertyType?: string;
  beds?: string;
  bathrooms?: string;
  maxGuests?: string;
  amenities?: string;
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters: GetListingFilters = {
    ...params,
    rating: params.rating ? Number(params.rating) : undefined,
    limit: params.limit ? Number(params.limit) : undefined,
    priceRange: params.priceRange
      ? [...params.priceRange.split(",").map((price) => Number(price))]
      : undefined,
    beds: params.beds ? Number(params.beds) : undefined,
    bathrooms: params.bathrooms ? Number(params.bathrooms) : undefined,
    maxGuests: params.maxGuests ? Number(params.maxGuests) : undefined,
    amenities: params.amenities ? params.amenities.split(",") : undefined,
    availabilityRange: params.availabilityRange
      ? params.availabilityRange.split(",")
      : undefined,
  };

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
          description="There are no listings to show yet."
        />
      )}
    </PageLayout>
  );
}
