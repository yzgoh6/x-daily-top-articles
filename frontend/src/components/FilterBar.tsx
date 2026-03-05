"use client";

import { Suspense } from "react";
import CategoryChips from "./CategoryChips";
import DatePicker from "./DatePicker";

interface Props {
  categoryCounts: Record<string, number>;
}

function FilterSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-md" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-md" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-md" />
      </div>
    </div>
  );
}

export default function FilterBar({ categoryCounts }: Props) {
  return (
    <Suspense fallback={<FilterSkeleton />}>
      <div className="space-y-3">
        <CategoryChips categoryCounts={categoryCounts} />
        <DatePicker />
      </div>
    </Suspense>
  );
}
