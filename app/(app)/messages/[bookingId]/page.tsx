import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Chat from "@/components/chat/chat";
import { getCurrentUser } from "@/lib/services/auth";

export const metadata: Metadata = { title: "Conversation" };

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  return <Chat bookingId={bookingId} currentUserId={user.id} />;
}
