import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { bookingStatusVariant, cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types/chat";
import { counterpartOf } from "./types";

/**
 * One row of the messages rail. Presentational: the whole row is the link to
 * its thread, so there is no click handler and no local state — and therefore
 * no `"use client"`; the list that imports it already pulls it client-side.
 */
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
        // Tinted with the foreground rather than `muted`, so the row reads as a
        // lift on the rail's `sidebar` surface in both themes — `muted` is
        // darker than `sidebar` in dark mode and would recede instead.
        "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
        active ? "bg-foreground/10" : "hover:bg-foreground/5",
      )}
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {photo ? (
          // `unoptimized` matches listing-photos.tsx: the photo URLs are
          // remote and next.config declares no remotePatterns for them.
          <Image
            src={photo}
            alt=""
            fill
            unoptimized
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
            className="ml-auto shrink-0"
          >
            {status}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Your {counterpart.toLowerCase()}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(start_date)} – {formatDate(end_date)}
        </p>
      </div>
    </Link>
  );
}
