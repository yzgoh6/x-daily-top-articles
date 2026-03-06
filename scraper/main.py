"""Entry point: orchestrate fetch → classify → score → store."""

from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

from x_fetcher import fetch_tweets
from xhs_fetcher import fetch_notes
from scorer import rank_and_trim
from db import upsert_articles, cleanup_old_articles
from config import TOP_N

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _batch_key() -> str:
    """Generate a daily batch key like '2026-03-05'."""
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%d")


async def run() -> None:
    batch = _batch_key()
    logger.info(f"=== Starting scrape, batch={batch} ===")

    try:
        # 1. Fetch from both platforms (one failing doesn't block the other)
        articles: list[dict] = []

        try:
            tweets = await fetch_tweets()
            logger.info(f"Fetched {len(tweets)} candidate tweets")
            articles.extend(tweets)
        except Exception:
            logger.error("X (Twitter) fetch failed", exc_info=True)

        try:
            notes = await fetch_notes()
            logger.info(f"Fetched {len(notes)} candidate XHS notes")
            articles.extend(notes)
        except Exception:
            logger.error("XHS fetch failed", exc_info=True)

        if not articles:
            logger.warning("No articles fetched from any platform, exiting")
            return

        # 2. Score & rank
        top = rank_and_trim(articles, TOP_N)
        logger.info(f"Top {len(top)} after scoring")

        # 3. Attach batch key
        for t in top:
            t["fetch_batch"] = batch

        # 4. Write to Supabase
        written = upsert_articles(top)
        logger.info(f"Wrote {written} articles to Supabase")

        # 5. Cleanup old data
        cleanup_old_articles(30)

        logger.info("=== Scrape complete ===")
    except Exception:
        logger.error("Scrape failed", exc_info=True)
        sys.exit(1)


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
