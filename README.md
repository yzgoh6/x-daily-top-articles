# X Daily Top Articles

A personal dashboard that automatically scrapes trending articles from X (Twitter) every hour, classifies them by category, and displays them in a clean, filterable dashboard.

## Architecture

```
GitHub Actions (Hourly Cron)      Supabase (PostgreSQL)      Vercel (Next.js)
┌──────────────────────┐         ┌──────────────────┐       ┌──────────────────┐
│  Python Scraper      │────────>│  articles table   │<──────│  Dashboard       │
│  - twikit (X API)    │  write  │  x_cookies table  │  read │  - Category tabs │
│  - Keyword classify  │         │                   │       │  - Sort & filter │
│  - Engagement score  │         │                   │       │  - Date picker   │
└──────────────────────┘         └──────────────────┘       └──────────────────┘
```

## Categories

AI, Tech, Crypto, Finance, Business, Startup, Education, Other

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Scraper | Python + [twikit](https://github.com/d60/twikit) | Free |
| Scheduler | GitHub Actions (hourly cron) | Free |
| Database | Supabase (PostgreSQL) | Free tier |
| Frontend | Next.js + Tailwind CSS | Free |
| Hosting | Vercel | Free tier |

## Project Structure

```
daily-top-articles/
├── scraper/
│   ├── main.py              # Entry point
│   ├── config.py            # Categories, keywords, search queries, spam patterns
│   ├── x_fetcher.py         # X scraper using twikit
│   ├── classifier.py        # Weighted keyword classification
│   ├── scorer.py            # Engagement scoring & dedup
│   ├── db.py                # Supabase read/write
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx         # Main dashboard (client component)
│   │   ├── settings/        # Cookie management (admin-protected)
│   │   └── api/cookies/     # Cookie API (admin-protected)
│   ├── src/components/
│   │   └── ArticleCard.tsx
│   └── src/lib/
│       ├── supabase.ts
│       └── types.ts
├── .github/workflows/
│   └── scrape.yml           # Hourly cron job
└── README.md
```

## How It Works

1. **Scrape** — GitHub Actions runs the Python scraper every hour
2. **Search** — Queries X for trending tweets across all categories with `lang:en` filter
3. **Filter** — Removes spam, non-English/Chinese content, and low-quality tweets
4. **Classify** — Assigns categories using weighted keyword matching (score threshold: 3)
5. **Score** — Calculates engagement: `likes + comments*3 + shares*5 + views*0.01`
6. **Store** — Upserts top 50 articles into Supabase (daily batch dedup)
7. **Display** — Frontend fetches and renders with client-side filtering/sorting

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com) and create the `articles` and `x_cookies` tables. Enable RLS with public read on `articles`.

### 2. Environment Variables

**GitHub Secrets** (for scraper):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

**Vercel Environment Variables** (for frontend):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_SECRET` — protects the `/settings` page and cookie API

### 3. X Cookies

Go to `/settings` on the deployed frontend, enter the admin password, and add your X cookies (`auth_token`, `ct0`).

### 4. Deploy

- **Frontend**: Connect the repo to Vercel, set root directory to `frontend/`
- **Scraper**: GitHub Actions runs automatically on push and hourly (or manually via `workflow_dispatch`)

## Local Development

```bash
# Scraper
cd scraper
pip install -r requirements.txt
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

## Scoring

```
engagement_score = likes * 1 + comments * 3 + shares * 5 + views * 0.01
```

Articles with engagement score below 100 are hidden from the dashboard.
