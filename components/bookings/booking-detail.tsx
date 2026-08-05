import type { ReactNode } from "react";
import { LogIn, LogOut, Moon, Users } from "lucide-react";
import { Section } from "@/components/common/section";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/dates";
import { formatPrice } from "@/lib/utils";
import { BookingCancellationPolicy } from "./booking-detail-cancellation";
import { BookingDetailHero } from "./booking-detail-hero";
import {
  describeStatus,
  priceBreakdown,
  stayStage,
} from "./booking-detail-model";
import type { BookingRow } from "./bookings-model";

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="text-base font-medium">{value}</dd>
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

export function BookingDetail({
  booking,
  now,
}: {
  booking: BookingRow;
  now: Date;
}) {
  const stage = stayStage(booking, now.getTime());
  const status = describeStatus(booking.status ?? "pending", stage);
  const price = priceBreakdown(booking);

  return (
    <div className="flex flex-col gap-8">
      <BookingDetailHero booking={booking} />

      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-8">
          <Section title="Your stay" card>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Fact
                icon={<LogIn />}
                label="Check-in"
                value={formatDate(booking.start_date)}
              />
              <Fact
                icon={<LogOut />}
                label="Check-out"
                value={formatDate(booking.end_date)}
              />
              <Fact icon={<Moon />} label="Nights" value={price.nights || "—"} />
              <Fact
                icon={<Users />}
                label="Guests"
                value={booking.guests ?? "—"}
              />
            </dl>

            <Separator className="my-4" />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Booked on {formatDate(booking.created_at)}</span>
              <span className="font-mono">
                Ref. {booking.id?.slice(0, 8) ?? "—"}
              </span>
            </div>
          </Section>

          <Section title="Cancellation policy" card>
            <BookingCancellationPolicy booking={booking} now={now} />
          </Section>
        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-32">
          <Section title="Status" card>
            <p className="text-base font-medium">{status.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.detail}
            </p>
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
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
