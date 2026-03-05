-- Run this in Supabase SQL Editor to create the articles table

CREATE TABLE articles (
  id               BIGSERIAL PRIMARY KEY,
  platform         TEXT NOT NULL DEFAULT 'x',
  external_id      TEXT NOT NULL,
  title            TEXT,
  content          TEXT,
  author           TEXT,
  author_handle    TEXT,
  url              TEXT,
  image_url        TEXT,
  category         TEXT NOT NULL,
  likes            INTEGER DEFAULT 0,
  comments         INTEGER DEFAULT 0,
  shares           INTEGER DEFAULT 0,
  views            INTEGER DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,
  published_at     TIMESTAMPTZ,
  fetched_at       TIMESTAMPTZ DEFAULT NOW(),
  fetch_batch      TEXT NOT NULL,
  UNIQUE(platform, external_id, fetch_batch)
);

CREATE INDEX idx_articles_date ON articles (fetched_at DESC);
CREATE INDEX idx_articles_category ON articles (category);
CREATE INDEX idx_articles_score ON articles (engagement_score DESC);

-- RLS: public read access
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON articles FOR SELECT USING (true);
