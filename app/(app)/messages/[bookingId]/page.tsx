import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Chat from "@/components/chat/chat";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/apollo/client";
import { GetChatThreadDocument } from "@/lib/apollo/__generated__/operations";

export const metadata: Metadata = { title: "Conversation" };

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const { data } = await query({
    query: GetChatThreadDocument,
    variables: { bookingId },
    errorPolicy: "all",
  });

  return (
    <Chat bookingId={bookingId} currentUserId={user.id} thread={data?.chatThread ?? null} />
  );
}
