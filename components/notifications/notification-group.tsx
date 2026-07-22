import { NotificationRow } from "./notification-row";
import type { Notification } from "./notifications-model";

export function NotificationGroup({
  title,
  notifications,
  read,
  onMarkAsRead,
}: {
  title: string;
  notifications: Notification[];
  read: boolean;
  onMarkAsRead: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground/70">
          {notifications.length}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <ul className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification._id}
            notification={notification}
            read={read}
            onMarkAsRead={() => onMarkAsRead(notification._id)}
          />
        ))}
      </ul>
    </section>
  );
}
