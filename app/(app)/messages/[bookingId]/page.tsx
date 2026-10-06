import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Chat from "@/components/chat/chat";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/apollo/client";
import { GetChatThreadDocument } from "@/lib/apollo/__generated__/operations";
import { threadCursorSchema } from "@/lib/chat/validation";

export const metadata: Metadata = { title: "Conversation" };

export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const from = threadCursorSchema.safeParse((await searchParams).from).data ?? null;

  const { data } = await query({
    query: GetChatThreadDocument,
    variables: { id: bookingId, from },
    errorPolicy: "all",
  });

  return (
    <Chat bookingId={bookingId} currentUserId={user.id} thread={data?.chatThread ?? null} />
  );
}
