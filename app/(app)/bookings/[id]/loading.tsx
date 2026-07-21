import { PageLayout } from "@/components/common/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingDetailLoading() {
  return (
    <PageLayout
      title={<Skeleton className="h-9 w-64 max-w-full" />}
      actions={<Skeleton className="h-9 w-44 rounded-md" />}
    >
      <Skeleton className="h-4 w-72 max-w-full" />
    </PageLayout>
  );
}
