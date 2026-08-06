import type { ReactNode } from "react";
import { LogIn, LogOut, MapPin, Moon, Users } from "lucide-react";
import { Section } from "@/components/common/section";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/dates";
import { formatPrice } from "@/lib/utils";
import { BookingCancellationPolicy } from "./booking-detail-cancellation";
import { BookingDetailHero } from "./booking-detail-hero";
import {
  cancellationRecord,
  describeStatus,
  priceBreakdown,
  stayStage,
} from "./booking-detail-model";
import type { BookingDetailRow } from "./bookings-model";

function Fact({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="text-base font-medium">{value}</dd>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function PriceRow({
  label,
  amount,
  strong = false,
}: {
  label: ReactNode;
  amount: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${
        strong ? "text-base font-semibold" : "text-sm text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span className={strong ? undefined : "text-foreground"}>
        {formatPrice(amount)}
      </span>
    </div>
  );
}

/**
 * `review` is a slot rather than an import: the review form belongs to another
 * feature, and features don't reach across to each other — the route composes
 * them. Absent when there's no finished stay to review.
 */
export function BookingDetail({
  booking,
  now,
  review,
}: {
  booking: BookingDetailRow;
  now: Date;
  review?: ReactNode;
}) {
  const stage = stayStage(booking, now.getTime());
  const status = describeStatus(booking.status ?? "pending", stage);
  const price = priceBreakdown(booking);
  const settled = cancellationRecord(booking);
  const { location, attributes } = booking.listing ?? {};
  const place = [location?.city, location?.country].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-8">
      <BookingDetailHero booking={booking} />

      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-8">
          <Section title="Your stay" card>
            {place && (
              <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {place}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Fact
                icon={<LogIn />}
                label="Check-in"
                value={formatDate(booking.start_date)}
                note={
                  attributes?.check_in_time &&
                  `From ${attributes.check_in_time}`
                }
              />
              <Fact
                icon={<LogOut />}
                label="Check-out"
                value={formatDate(booking.end_date)}
                note={
                  attributes?.check_out_time &&
                  `Until ${attributes.check_out_time}`
                }
              />
              <Fact icon={<Moon />} label="Nights" value={price.nights || "—"} />
              <Fact
                icon={<Users />}
                label="Guests"
                value={booking.guests ?? "—"}
              />
            </dl>

            <Separator className="my-4" />

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Booked on {formatDate(booking.created_at)}
                {booking.host?.name && ` · Hosted by ${booking.host.name}`}
              </span>
              <span className="font-mono">Ref. {booking.id.slice(0, 8)}</span>
            </div>
          </Section>

          {review && (
            <Section
              title="Leave a review"
              subtitle="Share how the stay went to help other guests."
              card
            >
              {review}
            </Section>
          )}

          <Section
            title={settled ? "Cancellation" : "Cancellation policy"}
            card
          >
            <BookingCancellationPolicy booking={booking} now={now} />
          </Section>
        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-32">
          <Section title="Status" card>
            <p className="text-base font-medium">{status.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.detail}
            </p>
            {booking.status_reason && (
              <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                “{booking.status_reason}”
              </blockquote>
            )}
          </Section>

          <Section title="Price" card>
            <div className="flex flex-col gap-2">
              {price.nightlyRate != null && (
                <PriceRow
                  label={
                    <>
                      {formatPrice(price.nightlyRate)} × {price.nights} night
                      {price.nights === 1 ? "" : "s"}
                    </>
                  }
                  amount={price.total}
                />
              )}
              <Separator />
              <PriceRow label="Total" amount={price.total} strong />
              {settled && settled.refundAmount > 0 && (
                <PriceRow label="Refunded" amount={settled.refundAmount} />
              )}
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
