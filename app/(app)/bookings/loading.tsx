import { PageLayout } from "@/components/common/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingsLoading() {
  return (
    <PageLayout
      title="My bookings"
      subtitle="Track your upcoming and past reservations."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="flex h-full flex-col overflow-hidden rounded-xl border"
            >
              <Skeleton className="h-24 rounded-none" />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageLayout>
  );
}
