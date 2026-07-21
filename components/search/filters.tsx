"use client";

import { useReducer, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DatePicker } from "@/components/common/date-picker";
import { cn, formatPrice, humanize } from "@/lib/utils";
import { AMENITIES, PROPERTY_TYPES, type PropertyType } from "@/lib/listings";
import { fromISODate, toISODate } from "@/lib/dates";
import {
  countActiveFilters,
  DEFAULT_LIMIT,
  DEFAULT_TYPE,
  draftReducer,
  LISTING_TYPES,
  PRICE_MAX,
  PRICE_MIN,
  type Draft,
  type ListingType,
} from "./filters-draft";

const TYPE_LABELS: Record<ListingType, string> = {
  accommodation: "Accommodation",
  experience: "Experience",
  equipment: "Equipment",
};
const RATING_OPTIONS = [3, 4, 4.5] as const;
const LIMIT_OPTIONS = [12, 24, 48] as const;
const COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;
const PRICE_STEP = 10;

const urlOptions = { shallow: false } as const;

export function Filters() {
  // Applied filters live in the URL. We read them (for the trigger badge and to
  // seed the draft) but only write them back on "Show results" — editing stays
  // local, so no query fires until the user is done choosing.
  const [type, setType] = useQueryState(
    "type",
    parseAsStringLiteral(LISTING_TYPES)
      .withDefault(DEFAULT_TYPE)
      .withOptions(urlOptions),
  );
  const [propertyType, setPropertyType] = useQueryState(
    "propertyType",
    parseAsStringLiteral(PROPERTY_TYPES).withOptions(urlOptions),
  );
  const [beds, setBeds] = useQueryState(
    "beds",
    parseAsInteger.withOptions(urlOptions),
  );
  const [bathrooms, setBathrooms] = useQueryState(
    "bathrooms",
    parseAsInteger.withOptions(urlOptions),
  );
  const [maxGuests, setMaxGuests] = useQueryState(
    "maxGuests",
    parseAsInteger.withOptions(urlOptions),
  );
  const [amenities, setAmenities] = useQueryState(
    "amenities",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions(urlOptions),
  );
  const [rating, setRating] = useQueryState(
    "rating",
    parseAsFloat.withOptions(urlOptions),
  );
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(DEFAULT_LIMIT).withOptions(urlOptions),
  );
  const [priceRange, setPriceRange] = useQueryState(
    "priceRange",
    parseAsArrayOf(parseAsFloat)
      .withDefault([PRICE_MIN, PRICE_MAX])
      .withOptions(urlOptions),
  );
  const [availabilityRange, setAvailabilityRange] = useQueryState(
    "availabilityRange",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions(urlOptions),
  );

  function appliedToDraft(): Draft {
    const complete = availabilityRange.length === 2;
    return {
      type,
      propertyType,
      beds,
      bathrooms,
      maxGuests,
      amenities,
      availableFrom: complete ? fromISODate(availabilityRange[0]) : undefined,
      availableUntil: complete ? fromISODate(availabilityRange[1]) : undefined,
      rating,
      limit,
      priceRange,
    };
  }

  const [open, setOpen] = useState(false);
  const [draft, dispatch] = useReducer(draftReducer, undefined, appliedToDraft);

  // The slider owns a live value while dragging; it commits into the draft on
  // release. Mirror the draft price back into it (e.g. after Clear all / open).
  const [range, setRange] = useState<number[]>(draft.priceRange);
  const [prevPrice, setPrevPrice] = useState<number[]>(draft.priceRange);
  if (
    prevPrice[0] !== draft.priceRange[0] ||
    prevPrice[1] !== draft.priceRange[1]
  ) {
    setPrevPrice(draft.priceRange);
    setRange([draft.priceRange[0], draft.priceRange[1]]);
  }

  const [fromOpen, setFromOpen] = useState(false);
  const [untilOpen, setUntilOpen] = useState(false);
  // Impure `new Date()` captured once (render-purity rule / React Compiler).
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const activeCount = countActiveFilters(appliedToDraft()); // applied → badge
  const draftCount = countActiveFilters(draft); // draft → "Clear all"

  function handleOpenChange(next: boolean) {
    // Re-seed the draft from the applied filters whenever the dialog opens, so
    // edits abandoned by closing without "Show results" are discarded.
    if (next) dispatch({ type: "reseed", draft: appliedToDraft() });
    setOpen(next);
  }

  function handleFromSelect(date?: Date) {
    dispatch({ type: "selectFrom", date });
    setFromOpen(false);
    if (date) setUntilOpen(true);
  }

  function handleUntilSelect(date?: Date) {
    dispatch({ type: "selectUntil", date });
    setUntilOpen(false);
  }

  function clearAll() {
    // Only resets the draft; nothing applies until "Show results".
    dispatch({ type: "clearAll" });
    setRange([PRICE_MIN, PRICE_MAX]);
  }

  function applyFilters() {
    // All setters fire in the same tick; nuqs batches them into a single URL
    // update, so the results refetch exactly once.
    setType(draft.type === DEFAULT_TYPE ? null : draft.type);
    setPropertyType(draft.propertyType);
    setBeds(draft.beds);
    setBathrooms(draft.bathrooms);
    setMaxGuests(draft.maxGuests);
    setAmenities(draft.amenities.length > 0 ? draft.amenities : null);
    setRating(draft.rating);
    setLimit(draft.limit === DEFAULT_LIMIT ? null : draft.limit);
    setPriceRange(
      draft.priceRange[0] !== PRICE_MIN || draft.priceRange[1] !== PRICE_MAX
        ? draft.priceRange
        : null,
    );
    setAvailabilityRange(
      draft.availableFrom && draft.availableUntil
        ? [toISODate(draft.availableFrom), toISODate(draft.availableUntil)]
        : null,
    );
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-12 shrink-0 px-2 shadow-sm">
            <SlidersHorizontal />
            Filters
            {activeCount > 0 && (
              <Badge variant="primary" className="ml-0.5">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription>
            Narrow down listings by type, capacity, price and amenities.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto px-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-type">Type</Label>
              <Select
                value={draft.type}
                onValueChange={(value) =>
                  dispatch({
                    type: "set",
                    patch: { type: value as ListingType },
                  })
                }
              >
                <SelectTrigger id="filter-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-property-type">Property type</Label>
              <Select
                value={draft.propertyType ?? "any"}
                onValueChange={(value) =>
                  dispatch({
                    type: "set",
                    patch: {
                      propertyType:
                        value === "any" ? null : (value as PropertyType),
                    },
                  })
                }
              >
                <SelectTrigger id="filter-property-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MinCountField
              id="filter-beds"
              label="Beds"
              value={draft.beds}
              onChange={(value) =>
                dispatch({ type: "set", patch: { beds: value } })
              }
            />
            <MinCountField
              id="filter-bathrooms"
              label="Bathrooms"
              value={draft.bathrooms}
              onChange={(value) =>
                dispatch({ type: "set", patch: { bathrooms: value } })
              }
            />
            <MinCountField
              id="filter-guests"
              label="Guests"
              value={draft.maxGuests}
              onChange={(value) =>
                dispatch({ type: "set", patch: { maxGuests: value } })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-available-from">Available from</Label>
                <DatePicker
                  id="filter-available-from"
                  value={draft.availableFrom}
                  onSelect={handleFromSelect}
                  open={fromOpen}
                  onOpenChange={setFromOpen}
                  disabled={{ before: today }}
                  defaultMonth={draft.availableFrom ?? today}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-available-until">Available until</Label>
                <DatePicker
                  id="filter-available-until"
                  value={draft.availableUntil}
                  onSelect={handleUntilSelect}
                  open={untilOpen}
                  onOpenChange={setUntilOpen}
                  disabled={{ before: draft.availableFrom ?? today }}
                  defaultMonth={
                    draft.availableUntil ?? draft.availableFrom ?? today
                  }
                />
              </div>
            </div>
            {(draft.availableFrom || draft.availableUntil) && (
              <button
                type="button"
                onClick={() => dispatch({ type: "clearDates" })}
                className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear dates
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-rating">Minimum rating</Label>
            <Select
              value={draft.rating == null ? "any" : String(draft.rating)}
              onValueChange={(value) =>
                dispatch({
                  type: "set",
                  patch: { rating: value === "any" ? null : Number(value) },
                })
              }
            >
              <SelectTrigger id="filter-rating" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any rating</SelectItem>
                {RATING_OPTIONS.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r}+ stars
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Price range</Label>
              <span className="text-xs text-muted-foreground">
                {formatPrice(range[0])} –{" "}
                {range[1] >= PRICE_MAX
                  ? `${formatPrice(PRICE_MAX)}+`
                  : formatPrice(range[1])}
              </span>
            </div>
            <Slider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={range}
              onValueChange={(value) => setRange(value as number[])}
              onValueCommitted={(value) =>
                dispatch({
                  type: "set",
                  patch: { priceRange: value as number[] },
                })
              }
              aria-label="Price range"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const active = draft.amenities.includes(a);
                return (
                  <Button
                    key={a}
                    type="button"
                    variant={active ? "primary" : "outline"}
                    size="sm"
                    aria-pressed={active}
                    className={cn(!active && "text-foreground")}
                    onClick={() =>
                      dispatch({ type: "toggleAmenity", amenity: a })
                    }
                  >
                    {humanize(a)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-limit">Results per page</Label>
            <Select
              value={String(draft.limit)}
              onValueChange={(value) =>
                dispatch({ type: "set", patch: { limit: Number(value) } })
              }
            >
              <SelectTrigger id="filter-limit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} results
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={draftCount === 0}
          >
            Reset
          </Button>
          <Button size="sm" onClick={applyFilters}>
            Show results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MinCountField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value == null ? "any" : String(value)}
        onValueChange={(v) => onChange(v === "any" ? null : Number(v))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {COUNT_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}+
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
