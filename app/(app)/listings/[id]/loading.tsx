import { Skeleton } from "@/components/ui/skeleton";

export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Skeleton className="mb-6 h-4 w-32" />

        <header className="flex flex-col gap-3 border-b pb-8">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-48" />
        </header>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3 lg:gap-0">
          <div className="flex flex-col gap-4 pt-8 lg:col-span-2 lg:border-r lg:pr-10">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-4 pt-8 lg:pl-10">
            <Skeleton className="h-64 w-full rounded-xl" />
          </aside>
        </div>
      </div>
    </div>
  );
}
