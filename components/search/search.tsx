"use client";

import { ChangeEvent } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-2">
      <div className="group relative flex-1 md:max-w-3xl">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
        <Input
          type="search"
          placeholder="Search listings…"
          value={term || ""}
          onChange={handleChange}
          aria-label="Search listings"
          className="h-12 bg-background px-11 text-base shadow-sm md:text-base [&::-webkit-search-cancel-button]:appearance-none"
        />
        {term && (
          <span className="absolute top-1/2 right-2.5 flex -translate-y-1/2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setTerm(null)}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground"
            >
              <X />
            </Button>
          </span>
        )}
      </div>
      <Filters />
    </div>
  );
}
