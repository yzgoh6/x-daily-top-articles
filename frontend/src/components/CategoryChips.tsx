"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/types";

interface Props {
  categoryCounts: Record<string, number>;
}

export default function CategoryChips({ categoryCounts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "All";

  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  function select(cat: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const count = cat === "All" ? totalCount : (categoryCounts[cat] || 0);
        return (
          <button
            key={cat}
            onClick={() => select(cat)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors active:scale-95 ${
              active === cat
                ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-500"
            }`}
          >
            {cat}
            {count > 0 && (
              <span className={`ml-1 text-xs ${active === cat ? "text-gray-300 dark:text-gray-500" : "text-gray-400 dark:text-gray-500"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
