"use client";

import { Article } from "@/lib/types";
import { useState } from "react";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const categoryColors: Record<string, string> = {
  AI: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Tech: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Crypto: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Finance: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Business: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Startup: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function ImageWithFallback({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error || !src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className="w-16 h-16 rounded object-cover shrink-0"
    />
  );
}

export default function ArticleCard({ article }: { article: Article }) {
  const colorClass = categoryColors[article.category] ?? categoryColors["Other"];
  const time = timeAgo(article.published_at || article.fetched_at);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md active:scale-[0.99] transition-all bg-white dark:bg-gray-900"
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs" title={article.platform === "xhs" ? "XHS" : "X"}>
            {article.platform === "xhs" ? "\u{1F4D5}" : "\u{1D54F}"}
          </span>
          <span
            className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${colorClass}`}
          >
            {article.category}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-2">
            {article.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {article.author} {article.author_handle}
            {time && <span className="ml-2 text-gray-400 dark:text-gray-500">{time}</span>}
          </p>
          {article.content && article.content !== article.title && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">
              {article.content}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{formatNumber(article.likes ?? 0)} ❤</span>
            <span>{formatNumber(article.comments ?? 0)} 💬</span>
            <span>{formatNumber(article.shares ?? 0)} 🔄</span>
            {(article.views ?? 0) > 0 && (
              <span>{formatNumber(article.views ?? 0)} 👁</span>
            )}
          </div>
        </div>
        <ImageWithFallback src={article.image_url} alt="" />
      </div>
    </a>
  );
}
