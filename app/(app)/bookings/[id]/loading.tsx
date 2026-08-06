import { PageLayout } from "@/components/common/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingDetailLoading() {
  return (
    <PageLayout
      title={<Skeleton className="h-9 w-64 max-w-full" />}
      maxWidth="max-w-6xl"
      back={<Skeleton className="h-5 w-36 rounded-md" />}
      actions={
        <>
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </>
      }
    >
      <div className="flex flex-col gap-8">
        <Skeleton className="h-44 w-full rounded-xl md:h-60" />
        <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-8">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-8">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
