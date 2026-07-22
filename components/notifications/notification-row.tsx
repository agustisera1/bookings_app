import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { notificationVisual, type Notification } from "./notifications-model";

export function NotificationRow({
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
