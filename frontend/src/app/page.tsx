"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Article, CATEGORIES } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import { useTheme } from "@/components/ThemeProvider";

type SortMode = "hot" | "latest" | "most_liked" | "most_shared";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "latest", label: "Latest" },
  { value: "most_liked", label: "Most Liked" },
  { value: "most_shared", label: "Most Shared" },
];

const PAGE_SIZE = 50;
const MIN_SCORE = 100;

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortMode>("hot");
  const [date, setDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { theme, setTheme } = useTheme();

  const fetchArticles = useCallback(() => {
    supabase
      .from("articles")
      .select("*")
      .order("engagement_score", { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (err) {
          setError(true);
        } else {
          setArticles((data as Article[]) || []);
          setError(false);
        }
        setLoading(false);
      });
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchArticles, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchArticles]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, sort, date]);

  const filtered = useMemo(() => {
    let result = articles.filter((a) => (a.engagement_score ?? 0) >= MIN_SCORE);

    if (date) {
      result = result.filter((a) => a.fetched_at?.startsWith(date));
    }

    if (category !== "All") {
      result = result.filter((a) => a.category === category);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "latest":
          return (b.published_at ?? "").localeCompare(a.published_at ?? "");
        case "most_liked":
          return (b.likes ?? 0) - (a.likes ?? 0);
        case "most_shared":
          return (b.shares ?? 0) - (a.shares ?? 0);
        case "hot":
        default:
          return (b.engagement_score ?? 0) - (a.engagement_score ?? 0);
      }
    });

    return result;
  }, [articles, category, sort, date]);

  const visibleArticles = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMore = filtered.length > visibleCount;

  const qualityArticles = useMemo(
    () => articles.filter((a) => (a.engagement_score ?? 0) >= MIN_SCORE),
    [articles]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of qualityArticles) {
      counts[a.category] = (counts[a.category] || 0) + 1;
    }
    return counts;
  }, [qualityArticles]);

  const totalCount = qualityArticles.length;
  const lastFetched = useMemo(() => {
    if (!articles.length) return null;
    return articles.reduce((max, a) => (a.fetched_at > max ? a.fetched_at : max), articles[0].fetched_at);
  }, [articles]);

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const isToday = date === today;
  const isAll = date === "";

  const chipActive = "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100";
  const chipInactive = "bg-white text-gray-600 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-500";

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          X Daily Top Articles
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={`Theme: ${theme}`}
          >
            {theme === "dark" ? "\u{1F319}" : theme === "light" ? "\u{2600}\u{FE0F}" : "\u{1F4BB}"}
          </button>
          <a
            href="/settings"
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Settings
          </a>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => {
          const count = cat === "All" ? totalCount : (categoryCounts[cat] || 0);
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors active:scale-95 ${
                active ? chipActive : chipInactive
              }`}
            >
              {cat}
              {count > 0 && (
                <span className={`ml-1 text-xs ${active ? "text-gray-300 dark:text-gray-500" : "text-gray-400 dark:text-gray-500"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Bar: View + Time */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        {/* View / Sort */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap ${
                sort === opt.value ? chipActive : chipInactive
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Time */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate("")}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              isAll ? chipActive : chipInactive
            }`}
          >
            All time
          </button>
          <button
            onClick={() => setDate(today)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              isToday ? chipActive : chipInactive
            }`}
          >
            Today
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm mb-4">
          Failed to load articles. Check Supabase configuration.
        </p>
      )}

      {/* Articles */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
            </div>
          ))
        ) : visibleArticles.length > 0 ? (
          <>
            {visibleArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </>
        ) : (
          <p className="text-gray-400 dark:text-gray-600 text-center py-12">
            No articles found.
          </p>
        )}
      </div>

      {lastFetched && !loading && (
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-8">
          Last updated: {new Date(lastFetched).toLocaleString()}
        </p>
      )}
    </main>
  );
}
