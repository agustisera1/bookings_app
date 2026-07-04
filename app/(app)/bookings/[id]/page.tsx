import { PageLayout } from "@/components/common/page-layout";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageLayout
      title="Booking details"
      subtitle="Review the details of your reservation."
    >
      <p className="text-sm text-muted-foreground">Booking detail: {id}</p>
    </PageLayout>
  );
}
