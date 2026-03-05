"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    router.push(`/?${params.toString()}`);
  }

  function clear() {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search articles..."
        className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2.5 sm:py-2 pr-24 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
      />
      <div className="absolute right-1 top-1 sm:top-1 flex gap-1">
        {value && (
          <button
            type="button"
            onClick={clear}
            className="px-2 py-1.5 sm:py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
        <button
          type="submit"
          className="px-3 py-1.5 sm:py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}

export default function SearchBar() {
  return (
    <Suspense>
      <SearchInput />
    </Suspense>
  );
}
