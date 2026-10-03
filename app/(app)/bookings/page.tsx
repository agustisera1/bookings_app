import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserBookings } from "@/components/bookings/user-bookings";
import { PageLayout } from "@/components/common/page-layout";
import { GetUserBookingsDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
import { getCurrentUser } from "@/lib/services/auth";

export const metadata: Metadata = { title: "My bookings" };

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

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
