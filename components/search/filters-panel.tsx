import type { Dispatch } from "react";
import { Button } from "@/components/ui/button";
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
import { MinCountField } from "./min-count-field";
import {
  LISTING_TYPES,
  PRICE_MAX,
  PRICE_MIN,
  type Draft,
  type DraftAction,
  type ListingType,
} from "./filters-draft";

const TYPE_LABELS: Record<ListingType, string> = {
  accommodation: "Accommodation",
  experience: "Experience",
  equipment: "Equipment",
};
const RATING_OPTIONS = [3, 4, 4.5] as const;
const LIMIT_OPTIONS = [12, 24, 48] as const;
const PRICE_STEP = 10;

type FiltersPanelProps = {
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
  range: number[];
  onRangeChange: (value: number[]) => void;
  today: Date;
  fromOpen: boolean;
  onFromOpenChange: (open: boolean) => void;
  untilOpen: boolean;
  onUntilOpenChange: (open: boolean) => void;
  onSelectFrom: (date?: Date) => void;
  onSelectUntil: (date?: Date) => void;
};

export function FiltersPanel({
  draft,
  dispatch,
  range,
  onRangeChange,
  today,
  fromOpen,
  onFromOpenChange,
  untilOpen,
  onUntilOpenChange,
  onSelectFrom,
  onSelectUntil,
}: FiltersPanelProps) {
  return (
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
                  propertyType: value === "any" ? null : (value as PropertyType),
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
          onChange={(value) => dispatch({ type: "set", patch: { beds: value } })}
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
              onSelect={onSelectFrom}
              open={fromOpen}
              onOpenChange={onFromOpenChange}
              disabled={{ before: today }}
              defaultMonth={draft.availableFrom ?? today}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-available-until">Available until</Label>
            <DatePicker
              id="filter-available-until"
              value={draft.availableUntil}
              onSelect={onSelectUntil}
              open={untilOpen}
              onOpenChange={onUntilOpenChange}
              disabled={{ before: draft.availableFrom ?? today }}
              defaultMonth={draft.availableUntil ?? draft.availableFrom ?? today}
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
          onValueChange={(value) => onRangeChange(value as number[])}
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
                onClick={() => dispatch({ type: "toggleAmenity", amenity: a })}
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
  );
}
