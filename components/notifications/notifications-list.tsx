"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Check,
  CreditCard,
  LogIn,
  MessageSquare,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { ServiceResult } from "@/lib/types";
import { NotificationDocument } from "@/lib/types/notification";
import { markAsRead } from "@/lib/services/notifications";
import { useNotificationsActions } from "@/components/notifications/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/empty-state";

type Notification = NotificationDocument;

/**
 * Picks a leading icon + accent tint from the notification title. Purely
 * cosmetic: notifications have no `type` field, so we key off keywords to give
 * each row a recognizable glyph instead of a generic bell.
 *
 * The palette is intentionally limited to three semantic accents: `success`
 * (good news), `destructive` (bad news) and `primary` (everything else / info).
 */
function notificationVisual(title: string): {
  icon: LucideIcon;
  accent: string;
} {
  const t = title.toLowerCase();

  const success = "text-success bg-success/10";
  const destructive = "text-destructive bg-destructive/10";
  const info = "text-primary bg-primary/10";

  if (t.includes("confirm")) return { icon: CalendarCheck, accent: success };
  if (t.includes("check-in") || t.includes("check in"))
    return { icon: LogIn, accent: success };
  if (t.includes("cancel")) return { icon: CalendarX, accent: destructive };
  if (t.includes("solicitud") || t.includes("request"))
    return { icon: CalendarPlus, accent: info };
  if (t.includes("pago") || t.includes("pay"))
    return { icon: CreditCard, accent: info };
  if (t.includes("reseña") || t.includes("review"))
    return { icon: Star, accent: info };
  if (t.includes("mensaje") || t.includes("message"))
    return { icon: MessageSquare, accent: info };
  return { icon: Bell, accent: info };
}

function NotificationRow({
  notification,
  read,
  onMarkAsRead,
}: {
  notification: Notification;
  read: boolean;
  onMarkAsRead: () => void;
}) {
  const { icon: Icon, accent } = notificationVisual(notification.title);

  return (
    <li
      className={cn(
        "group relative flex items-start gap-4 rounded-xl border border-border p-4 transition-colors",
        "hover:bg-muted/50",
        read ? "opacity-60" : "bg-primary/[0.03]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
          accent,
        )}
      >
        <Icon />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug text-pretty">
          {notification.title}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
          {notification.body}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatDate(new Date(notification.created_at))}
        </p>
      </div>

      {read ? (
        <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Check className="size-3.5" />
          Read
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={onMarkAsRead}
                >
                  <Check />
                  <span className="sr-only">Mark as read</span>
                </Button>
              }
            />
            <TooltipContent variant="dark">Mark as read</TooltipContent>
          </Tooltip>
          <Badge className="shrink-0">New</Badge>
        </div>
      )}
    </li>
  );
}

/**
 * A titled list of notification rows, reused for both the "new" (unread) and
 * "older" (read) sections. Every row in a group shares the same read state, so
 * it's passed once at the group level. Renders nothing when empty.
 *
 * The header (title + count + separator rule) mirrors `BookingSection` on the
 * My Bookings page so both surfaces read the same.
 */
function NotificationGroup({
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

export function NotificationsList({
  notificationsPromise,
}: {
  notificationsPromise: Promise<ServiceResult<Notification[]>>;
}) {
  // Ids marked read this session, overlaid on top of the server data so an
  // optimistic update survives re-renders without stale derived state.
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const { increment, decrement } = useNotificationsActions();
  const response = use(notificationsPromise);

  if (!response.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load your notifications, please try reloading the page.
      </p>
    );
  }

  const notifications = response.data;

  if (notifications.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<BellOff />}
        title="You're all caught up"
        description="New activity on your bookings and listings will show up here."
      />
    );
  }

  async function handleMarkAsRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id)); // optimistic
    decrement(); // optimistic: drop the sidebar badge right away
    const result = await markAsRead(id);
    if (!result.ok) {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      increment(); // revert the badge
      toast.error(result.error);
      return;
    }
    toast.success("Notification marked as read");
  }

  // Effective read state overlays the optimistic set on top of the server flag,
  // so marking a notification read moves it from "new" to "older" right away.
  const isRead = (n: Notification) => n.is_read || readIds.has(n._id);
  const unread = notifications.filter((n) => !isRead(n));
  const older = notifications.filter(isRead);

  return (
    <div className="flex flex-col gap-10">
      <NotificationGroup
        title="New"
        notifications={unread}
        read={false}
        onMarkAsRead={handleMarkAsRead}
      />
      <NotificationGroup
        title="Older notifications"
        notifications={older}
        read
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
}
