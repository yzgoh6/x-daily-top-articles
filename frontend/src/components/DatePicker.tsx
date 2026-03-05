"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function DatePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("date") ?? "";

  function setDate(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("date", value);
    } else {
      params.delete("date");
    }
    router.push(`/?${params.toString()}`);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDate(e.target.value);
  }

  const today = new Date().toISOString().slice(0, 10);
  const last7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const isToday = current === today;
  const isAll = current === "";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => setDate("")}
        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
          isAll
            ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
            : "bg-white text-gray-600 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-500"
        }`}
      >
        All time
      </button>
      <button
        onClick={() => setDate(today)}
        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
          isToday
            ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
            : "bg-white text-gray-600 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-500"
        }`}
      >
        Today
      </button>
      <input
        type="date"
        value={current}
        onChange={onChange}
        max={today}
        className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    </div>
  );
}
