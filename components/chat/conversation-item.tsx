import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateRange } from "@/lib/dates";
import { bookingStatusVariant, cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types/chat";
import { counterpartOf } from "./types";

export function ConversationItem({
  conversation,
  active,
}: {
  conversation: Conversation;
  active: boolean;
}) {
  const { id, title, photo, start_date, end_date, status, party } =
    conversation;
  const counterpart = counterpartOf(party);

  return (
    <Link
      href={`/messages/${id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        // Foreground tint, not `muted`: `muted` is darker than `sidebar` in dark mode and would recede.
        "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
        active ? "bg-foreground/10" : "hover:bg-foreground/5",
      )}
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <MessageSquare className="size-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium leading-tight">{title}</p>
          <Badge
            variant={bookingStatusVariant[status]}
            className="ml-auto shrink-0 capitalize"
          >
            {status}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Your {counterpart.toLowerCase()}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateRange(start_date, end_date)}
        </p>
      </div>
    </Link>
  );
}
