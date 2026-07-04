import { UserBookings } from "@/components/bookings/user-bookings";
import { PageLayout } from "@/components/common/page-layout";
import { GetUserBookingsDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
import { getCurrentUser } from "@/lib/services/auth";

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) return "Unauthenticated";

  const userBookingsPromise = query({
    query: GetUserBookingsDocument,
  });

  return (
    <PageLayout
      title="My bookings"
      subtitle="Track your upcoming and past reservations."
    >
      <UserBookings userBookingsPromise={userBookingsPromise} />
    </PageLayout>
  );
}
