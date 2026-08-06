import { PageLayout } from "@/components/common/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListingDetailLoading() {
  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
      <div className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <PageLayout
          back={<Skeleton className="h-5 w-32 rounded-md" />}
          title={<Skeleton className="h-9 w-2/3 max-w-full" />}
          subtitle={<Skeleton className="h-4 w-48" />}
          actions={<Skeleton className="h-8 w-40 rounded-lg" />}
          contentClassName="flex flex-col gap-4"
        >
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </PageLayout>
      </div>

      <aside className="shrink-0 border-t px-6 py-5 md:px-10 md:py-6 lg:min-h-0 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-8">
        <Skeleton className="h-64 w-full rounded-xl" />
      </aside>
    </div>
  );
}
