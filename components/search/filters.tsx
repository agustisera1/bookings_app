"use client";

import { SlidersHorizontal } from "lucide-react";
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
import { FiltersPanel } from "./filters-panel";
import { useFilters } from "./use-filters";

export function Filters() {
  const {
    open,
    onOpenChange,
    draft,
    dispatch,
    range,
    setRange,
    today,
    fromOpen,
    setFromOpen,
    untilOpen,
    setUntilOpen,
    onSelectFrom,
    onSelectUntil,
    activeCount,
    draftCount,
    clearAll,
    applyFilters,
  } = useFilters();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <FiltersPanel
          draft={draft}
          dispatch={dispatch}
          range={range}
          onRangeChange={setRange}
          today={today}
          fromOpen={fromOpen}
          onFromOpenChange={setFromOpen}
          untilOpen={untilOpen}
          onUntilOpenChange={setUntilOpen}
          onSelectFrom={onSelectFrom}
          onSelectUntil={onSelectUntil}
        />

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
