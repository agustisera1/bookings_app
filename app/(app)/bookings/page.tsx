import { UserBookings } from "@/components/bookings/user-bookings";
import { GetUserBookingsDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
import { getCurrentUser } from "@/lib/services/auth";

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) return "Unauthenticated";

  const userBookingsPromise = query({
    query: GetUserBookingsDocument,
    variables: { guest_id: user.id },
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-semibold">My bookings</h1>
      <UserBookings userBookingsPromise={userBookingsPromise} />
    </div>
  );
}
