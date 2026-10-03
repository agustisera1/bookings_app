import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageLayout } from "@/components/common/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { getUserNotifications } from "@/lib/services/notifications";
import { getCurrentUser } from "@/lib/services/auth";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const notificationsPromise = getUserNotifications();

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
