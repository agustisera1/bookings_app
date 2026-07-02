import { Listings } from "@/components/listings/listings";
import { Search } from "@/components/search/search";
import { GetListingsDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
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
    variables: { limit: 10, term: q },
  });

  return (
    <div className="p-10 flex flex-col gap-6">
      <Suspense>
        <Search />
      </Suspense>

      {!!error && (
        <div className="p-10 flex flex-col gap-6">Internal error.</div>
      )}

      {listings?.length === 0 && (
        <div className="p-10 flex flex-col gap-6">
          No listings found for {"term"}
        </div>
      )}

      {listings && listings?.length > 0 && <Listings listings={listings} />}
    </div>
  );
}
