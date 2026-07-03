import { getCurrentUser } from "@/lib/services/auth";
import { forbidden } from "next/navigation";
import { query } from "@/lib/apollo/client";
import { GetListingsDocument } from "@/lib/apollo/__generated__/operations";
import { ListingsGrid } from "@/components/listings/listings-grid";

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user?.is_host) forbidden();

  const {
    data: { listings },
    error,
  } = await query({
    query: GetListingsDocument,
    variables: { own: true },
  });

  return (
    <div className="p-10 flex flex-col gap-6">
      {!!error && (
        <div className="p-10 flex flex-col gap-6">Internal error.</div>
      )}

      {listings?.length === 0 && (
        <div className="p-10 flex flex-col gap-6">
          No listings found for {"term"}
        </div>
      )}

      <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
      {listings && listings?.length > 0 && (
        <ListingsGrid listings={listings} />
      )}
    </div>
  );
}
