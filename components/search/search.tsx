"use client";

import { ChangeEvent } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQueryState, debounce } from "nuqs";
import { Filters } from "./filters";

export function Search() {
  const [term, setTerm] = useQueryState("term", {
    shallow: false,
    limitUrlUpdates: debounce(500),
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setTerm(e.target.value || null);
  }

  return (
    <div className="flex items-center gap-3">
      {/* Elevated search bar; focus lifts it (the ring token is the brand's
          acid-green in dark). Filters sits just past its end, as a matched peer. */}
      <div className="group flex flex-1 items-center gap-2 rounded-lg border bg-card/60 p-1.5 pl-4 shadow-sm transition-[box-shadow,border-color] focus-within:border-ring/50 focus-within:shadow-md md:max-w-3xl">
        <SearchIcon className="pointer-events-none size-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-foreground" />
        <div className="relative flex-1">
          <Input
            type="search"
            placeholder="Search listings…"
            value={term || ""}
            onChange={handleChange}
            aria-label="Search listings"
            className="h-9 border-transparent bg-transparent px-1 pr-8 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 md:text-base [&::-webkit-search-cancel-button]:appearance-none"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm(null)}
              aria-label="Clear search"
              className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <Filters />
    </div>
  );
}
