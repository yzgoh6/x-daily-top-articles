"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Article, CATEGORIES } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  // Fetch all articles once
  useEffect(() => {
    supabase
      .from("articles")
      .select("*")
      .order("engagement_score", { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => {
        if (err) {
          setError(true);
        } else {
          setArticles((data as Article[]) || []);
        }
        setLoading(false);
      });
  }, []);

  // Client-side filtering — instant, no network calls
  const filtered = useMemo(() => {
    let result = articles;

    if (date) {
      result = result.filter((a) => a.fetched_at?.startsWith(date));
    }

    if (category !== "All") {
      result = result.filter((a) => a.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.content?.toLowerCase().includes(q) ||
          a.title?.toLowerCase().includes(q) ||
          a.author?.toLowerCase().includes(q)
      );
    }

    return result.slice(0, 50);
  }, [articles, category, search, date]);

  // Category counts from all articles
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of articles) {
      counts[a.category] = (counts[a.category] || 0) + 1;
    }
    return counts;
  }, [articles]);

  const totalCount = articles.length;

  const lastFetched = articles[0]?.fetched_at ?? null;

  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;
  const isAll = date === "";

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          X Daily Top Articles
        </h1>
        <a
          href="/settings"
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Settings
        </a>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {CATEGORIES.map((cat) => {
          const count = cat === "All" ? totalCount : (categoryCounts[cat] || 0);
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors active:scale-95 ${
                active
                  ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-500"
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

      {/* Date Picker */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
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
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
          className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2.5 sm:py-2 pr-16 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Clear
            </button>
          )}
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
        ) : filtered.length > 0 ? (
          filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))
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
