"use client";

import { useReducer, useState } from "react";
import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { PROPERTY_TYPES } from "@/lib/listings";
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
} from "./filters-draft";

const urlOptions = { shallow: false } as const;

// Wires the URL <-> draft round trip and the transient slider/picker state the
// panel renders against. Every draft transition lives in `draftReducer` (pure,
// in filters-draft); this hook only holds the state and dispatches intent.
export function useFilters() {
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

  return {
    open,
    onOpenChange: handleOpenChange,
    draft,
    dispatch,
    range,
    setRange,
    today,
    fromOpen,
    setFromOpen,
    untilOpen,
    setUntilOpen,
    onSelectFrom: handleFromSelect,
    onSelectUntil: handleUntilSelect,
    activeCount,
    draftCount,
    clearAll,
    applyFilters,
  };
}
