"use client";

import { ChangeEvent } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQueryState, debounce } from "nuqs";
import { Filters } from "./filters";

export function Search() {
  const [q, setQ] = useQueryState("q", {
    shallow: false,
    limitUrlUpdates: debounce(500),
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value || null);
  }

  return (
    <div className="flex justify-between items-center">
      <div className="group relative w-full max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
        <Input
          type="search"
          placeholder="Search listings…"
          value={q || ""}
          onChange={handleChange}
          aria-label="Search listings"
          className="h-10 rounded-full pr-10 pl-9 shadow-sm [&::-webkit-search-cancel-button]:appearance-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ(null)}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Filters />
    </div>
  );
}
