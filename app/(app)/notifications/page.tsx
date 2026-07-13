import { Suspense } from "react";
import { PageLayout } from "@/components/common/page-layout";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { getUserNotifications } from "@/lib/services/notifications";
import { getCurrentUser } from "@/lib/services/auth";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return "Unauthenticated";

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
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-xl border bg-muted/40"
              />
            ))}
          </div>
        }
      >
        <NotificationsList notificationsPromise={notificationsPromise} />
      </Suspense>
    </PageLayout>
  );
}
