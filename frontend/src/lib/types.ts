export interface Article {
  id: number;
  platform: string;
  external_id: string;
  title: string;
  content: string;
  author: string;
  author_handle: string;
  url: string;
  image_url: string;
  category: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement_score: number;
  published_at: string | null;
  fetched_at: string;
  fetch_batch: string;
}

export const CATEGORIES = [
  "All",
  "AI",
  "Tech",
  "Crypto",
  "Finance",
  "Business",
  "Startup",
  "Education",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
