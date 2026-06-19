"use client";

import { useState } from "react";
import { CalendarIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

async function mockCreateBooking(data: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}) {
  await new Promise((r) => setTimeout(r, 900));
  console.log("[mock] createBooking", data);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calcNights(from: Date | undefined, to: Date | undefined): number {
  if (!from || !to) return 0;
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

const triggerClass = (hasValue: boolean) =>
  cn(
    "h-10 w-full justify-start rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    !hasValue && "text-muted-foreground"
  );

export function BookingForm({
  listingId,
  pricePerNight,
}: {
  listingId: string;
  pricePerNight: number;
}) {
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [guests, setGuests] = useState(1);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const nights = calcNights(checkIn, checkOut);
  const total = nights * pricePerNight;

  function handleCheckInSelect(date: Date | undefined) {
    setCheckIn(date);
    if (checkOut && date && checkOut <= date) setCheckOut(undefined);
    setCheckInOpen(false);
    if (date) setCheckOutOpen(true);
  }

  function handleCheckOutSelect(date: Date | undefined) {
    setCheckOut(date);
    setCheckOutOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkIn || !checkOut) return;
    setPending(true);
    await mockCreateBooking({
      listingId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      guests,
    });
    setPending(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-3xl">🎉</span>
        <p className="font-medium">Booking requested!</p>
        <p className="text-sm text-muted-foreground">
          You will receive a confirmation shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label>Check-in</Label>
          <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger className={triggerClass(!!checkIn)}>
              <span className="inline-flex items-center gap-2">
                <CalendarIcon className="size-4 shrink-0" />
                {checkIn ? formatDate(checkIn) : "Add date"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={handleCheckInSelect}
                disabled={{ before: new Date() }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Check-out</Label>
          <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger className={triggerClass(!!checkOut)}>
              <span className="inline-flex items-center gap-2">
                <CalendarIcon className="size-4 shrink-0" />
                {checkOut ? formatDate(checkOut) : "Add date"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={handleCheckOutSelect}
                disabled={{ before: checkIn ?? new Date() }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="guests">Guests</Label>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="guests"
            type="number"
            min={1}
            max={16}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="pl-9 h-10"
            required
          />
        </div>
      </div>

      {nights > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                ${pricePerNight} × {nights} night{nights !== 1 ? "s" : ""}
              </span>
              <span>${total}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>${total}</span>
            </div>
          </div>
        </>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending || !checkIn || !checkOut}
        className="w-full"
      >
        {pending ? "Requesting…" : "Book now"}
      </Button>
    </form>
  );
}
