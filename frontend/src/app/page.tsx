import { supabase } from "@/lib/supabase";
import { Article } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import FilterBar from "@/components/FilterBar";
import SearchBar from "@/components/SearchBar";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ date?: string; category?: string; q?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const { date, category, q } = params;

  let query = supabase
    .from("articles")
    .select("*")
    .order("engagement_score", { ascending: false })
    .limit(50);

  if (date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];
    query = query
      .gte("fetched_at", `${date}T00:00:00Z`)
      .lt("fetched_at", `${nextDayStr}T00:00:00Z`);
  }

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  if (q) {
    query = query.ilike("content", `%${q}%`);
  }

  const { data: articles, error } = await query;

  // Get category counts
  const { data: allArticles } = await supabase
    .from("articles")
    .select("category")
    .order("engagement_score", { ascending: false })
    .limit(500);

  const categoryCounts: Record<string, number> = {};
  if (allArticles) {
    for (const a of allArticles) {
      categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
    }
  }

  // Get last fetched time
  const { data: latest } = await supabase
    .from("articles")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1);

  const lastFetched = latest?.[0]?.fetched_at ?? null;

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

      <div className="mb-4">
        <FilterBar categoryCounts={categoryCounts} />
      </div>

      <div className="mb-6">
        <SearchBar />
      </div>

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm mb-4">
          Failed to load articles. Check Supabase configuration.
        </p>
      )}

      <div className="space-y-3">
        {articles && articles.length > 0 ? (
          (articles as Article[]).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))
        ) : (
          <p className="text-gray-400 dark:text-gray-600 text-center py-12">
            No articles found. Run the scraper to populate data.
          </p>
        )}
      </div>

      {lastFetched && (
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-8">
          Last updated: {new Date(lastFetched).toLocaleString()}
        </p>
      )}
    </main>
  );
}
