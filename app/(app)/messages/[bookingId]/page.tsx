import Chat from "@/components/chat/chat";
import { getCurrentUser } from "@/lib/services/auth";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) return "Unauthenticated";

  // `fill` lets the thread own the pane's height; the standalone card sizing
  // Chat defaults to belongs to the booking-detail placement, not here.
  return <Chat bookingId={bookingId} currentUserId={user.id} fill />;
}
