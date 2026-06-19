"use client";

import { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { useQueryState, debounce } from "nuqs";

export function Search() {
  const [q, setQ] = useQueryState("q", {
    shallow: false,
    limitUrlUpdates: debounce(500),
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
  }

  return (
    <Input
      type="search"
      placeholder="Search listings…"
      value={q || ""}
      onChange={handleChange}
      className="max-w-sm"
    />
  );
}
