import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageLayout } from "@/components/common/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { query } from "@/lib/apollo/client";
import { GetNotificationsDocument } from "@/lib/apollo/__generated__/operations";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const notificationsPromise = query({
    query: GetNotificationsDocument,
    errorPolicy: "all",
  }).then(({ data }) => data?.notifications ?? null);

  return (
    <PageLayout
      title="Notifications"
      subtitle="Activity on your bookings and listings, newest first."
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-19 rounded-xl" />
            ))}
          </div>
        }
      >
        <NotificationsList notificationsPromise={notificationsPromise} />
      </Suspense>
    </PageLayout>
  );
}
