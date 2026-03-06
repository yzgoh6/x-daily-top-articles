"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Article, CATEGORIES } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import { useTheme } from "@/components/ThemeProvider";

type SortMode = "hot" | "latest" | "most_liked" | "most_shared";
type PlatformFilter = "all" | "x" | "xhs";

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "x", label: "\u{1D54F}" },
  { value: "xhs", label: "\u{1F4D5} XHS" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "latest", label: "Latest" },
  { value: "most_liked", label: "Most Liked" },
  { value: "most_shared", label: "Most Shared" },
];

const PAGE_SIZE = 50;
const MIN_SCORE = 100;

function sortColumn(sort: SortMode): string {
  switch (sort) {
    case "latest": return "published_at";
    case "most_liked": return "likes";
    case "most_shared": return "shares";
    case "hot":
    default: return "engagement_score";
  }
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("All");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [sort, setSort] = useState<SortMode>("hot");
  const [date, setDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const { theme, setTheme } = useTheme();
  const fetchIdRef = useRef(0);

  const fetchArticles = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const id = ++fetchIdRef.current;

    // Build filtered query
    let query = supabase
      .from("articles")
      .select("*")
      .gte("engagement_score", MIN_SCORE);

    if (platform !== "all") query = query.eq("platform", platform);
    if (category !== "All") query = query.eq("category", category);
    if (date) query = query.eq("fetch_batch", date);

    query = query.order(sortColumn(sort), { ascending: false });
    query = query.range(0, visibleCount - 1);

    const { data, error: err } = await query;

    // Discard stale responses
    if (id !== fetchIdRef.current) return;

    if (err) {
      setError(true);
    } else {
      setArticles((data as Article[]) || []);
      setError(false);
    }
    setLoading(false);
    setRefreshing(false);
  }, [platform, category, date, sort, visibleCount]);

  // Fetch category counts (lightweight query for chip badges)
  const fetchCategoryCounts = useCallback(async () => {
    let query = supabase
      .from("articles")
      .select("category")
      .gte("engagement_score", MIN_SCORE)
      .limit(5000);

    if (platform !== "all") query = query.eq("platform", platform);
    if (date) query = query.eq("fetch_batch", date);

    const { data } = await query;
    if (!data) return;

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of data) {
      counts[row.category] = (counts[row.category] || 0) + 1;
      total++;
    }
    setCategoryCounts(counts);
    setTotalFiltered(total);
  }, [platform, date]);

  // Fetch articles when filters/sort/pagination change
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Fetch category counts when platform/date change
  useEffect(() => {
    fetchCategoryCounts();
  }, [fetchCategoryCounts]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchArticles({ silent: true });
      fetchCategoryCounts();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchArticles, fetchCategoryCounts]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, platform, sort, date]);

  const hasMore = articles.length === visibleCount;

  const lastFetched = useMemo(() => {
    if (!articles.length) return null;
    return articles.reduce((max, a) => (a.fetched_at > max ? a.fetched_at : max), articles[0].fetched_at);
  }, [articles]);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;
  const isAll = date === "";

  const hasActiveFilters = category !== "All" || platform !== "all" || date !== "";

  const clearAllFilters = () => {
    setCategory("All");
    setPlatform("all");
    setDate("");
  };

  const chipActive = "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100";
  const chipInactive = "bg-white text-gray-600 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-500";

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Refreshing indicator */}
      {refreshing && (
        <div className="fixed top-3 right-3 z-50 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs px-3 py-1.5 rounded-full shadow-lg animate-pulse">
          Updating...
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Daily Top Articles
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
          const count = cat === "All" ? totalFiltered : (categoryCounts[cat] || 0);
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

      {/* Platform Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PLATFORM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPlatform(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors active:scale-95 ${
              platform === opt.value ? chipActive : chipInactive
            }`}
          >
            {opt.label}
          </button>
        ))}
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
        ) : articles.length > 0 ? (
          <>
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Load more
              </button>
            )}
          </>
        ) : hasActiveFilters ? (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-600 mb-3">
              No articles match your filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-600 text-center py-12">
            No articles yet. The scraper may not have run today.
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
