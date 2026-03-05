# Daily Top Articles

每日热门文章看板 — 从 X (Twitter) 抓取 Top 文章，按分类展示。

## Architecture

```
GitHub Actions (3x/day)  →  Supabase (PostgreSQL)  ←  Vercel (Next.js)
Python scraper (twikit)     articles table             Dashboard UI
```

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase_schema.sql` in the SQL Editor
3. Note your project URL and keys

### 2. Frontend (Vercel)

```bash
cd frontend
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

Deploy to Vercel and set the same env vars.

### 3. Scraper (local test)

```bash
cd scraper
pip install -r requirements.txt
```

Set environment variables:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

```bash
python main.py
```

### 4. GitHub Actions

Add these secrets to your GitHub repo:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `X_USERNAME` (optional, for login mode)
- `X_PASSWORD` (optional, for login mode)

The workflow runs at UTC 0:00, 8:00, 14:00 (Beijing 8:00, 16:00, 22:00).

## Categories

AI, 科技, 金融, 商业, 创业, 教育, 健康, 娱乐, 其他

## Scoring

```
score = likes × 1 + comments × 3 + shares × 5 + views × 0.01
```
