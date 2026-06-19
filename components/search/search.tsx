"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

export function Search() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [input, setInput] = useState("");

  const updateParams = useCallback(
    (param: string) => {
      const curr = searchParams.toString();
      const params = new URLSearchParams(curr);
      params.set("q", param);
      router.replace(`${pathname}?${params}`);
    },
    [pathname, router, searchParams],
  );

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParams(input);
    }, 500);

    return () => clearTimeout(timeout);
  }, [input, updateParams]);

  return (
    <input
      className="bg-gray-700 text-white p-2"
      type="search"
      onChange={handleChange}
    />
  );
}
