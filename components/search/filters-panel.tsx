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
import { FormField } from "@/components/common/field";
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
const PROPERTY_TYPE_ITEMS = {
  any: "Any type",
  ...Object.fromEntries(PROPERTY_TYPES.map((t) => [t, humanize(t)])),
};
const RATING_ITEMS = {
  any: "Any rating",
  ...Object.fromEntries(RATING_OPTIONS.map((r) => [String(r), `${r}+ stars`])),
};
const LIMIT_ITEMS = Object.fromEntries(
  LIMIT_OPTIONS.map((n) => [String(n), `${n} results`]),
);
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
    <div className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-2">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Type" htmlFor="filter-type">
          <Select
            items={TYPE_LABELS}
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
        </FormField>

        <FormField label="Property type" htmlFor="filter-property-type">
          <Select
            items={PROPERTY_TYPE_ITEMS}
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
        </FormField>
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

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Available from" htmlFor="filter-available-from">
            <DatePicker
              id="filter-available-from"
              value={draft.availableFrom}
              onSelect={onSelectFrom}
              open={fromOpen}
              onOpenChange={onFromOpenChange}
              disabled={{ before: today }}
              defaultMonth={draft.availableFrom ?? today}
            />
          </FormField>

          <FormField label="Available until" htmlFor="filter-available-until">
            <DatePicker
              id="filter-available-until"
              value={draft.availableUntil}
              onSelect={onSelectUntil}
              open={untilOpen}
              onOpenChange={onUntilOpenChange}
              disabled={{ before: draft.availableFrom ?? today }}
              defaultMonth={draft.availableUntil ?? draft.availableFrom ?? today}
            />
          </FormField>
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

      <FormField label="Minimum rating" htmlFor="filter-rating">
        <Select
          items={RATING_ITEMS}
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
      </FormField>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Price range</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPrice(range[0])} -{" "}
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

      <FormField label="Amenities">
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
      </FormField>

      <FormField label="Results per page" htmlFor="filter-limit">
        <Select
          items={LIMIT_ITEMS}
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
      </FormField>
    </div>
  );
}
