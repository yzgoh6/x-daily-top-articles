"""Fetch tweets from X using twikit with cookies from Supabase."""

from __future__ import annotations

import asyncio
import os
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any

from twikit import Client

from config import CATEGORIES
from classifier import classify, is_spam
from db import get_client as get_supabase

logger = logging.getLogger(__name__)


def _safe_int(val: Any) -> int:
    """Safely convert value to int, handling comma-formatted strings."""
    if val is None:
        return 0
    if isinstance(val, int):
        return val
    try:
        return int(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return 0


def _parse_date(date_str: str | None) -> str | None:
    """Convert Twitter date format to ISO 8601 for Supabase."""
    if not date_str:
        return None
    try:
        # Twitter format: "Wed Oct 10 20:19:24 +0000 2018"
        dt = datetime.strptime(date_str, "%a %b %d %H:%M:%S %z %Y")
        return dt.isoformat()
    except (ValueError, TypeError):
        # Already ISO or unknown format — return as-is
        return date_str


def _parse_tweet(tweet: Any) -> dict[str, Any] | None:
    """Convert a twikit Tweet object into a flat dict."""
    try:
        tweet_id = str(tweet.id)
        text = tweet.text or ""
        user = tweet.user
        author = user.name if user else ""
        handle = user.screen_name if user else ""

        media = tweet.media or []
        image_url = ""
        if media:
            first = media[0]
            image_url = getattr(first, "media_url_https", "") or ""

        return {
            "platform": "x",
            "external_id": tweet_id,
            "title": text[:100],
            "content": text,
            "author": author,
            "author_handle": f"@{handle}" if handle else "",
            "url": f"https://x.com/{handle}/status/{tweet_id}" if handle else "",
            "image_url": image_url,
            "likes": tweet.favorite_count or 0,
            "comments": tweet.reply_count or 0,
            "shares": tweet.retweet_count or 0,
            "views": _safe_int(getattr(tweet, "view_count", 0)),
            "published_at": _parse_date(tweet.created_at) if hasattr(tweet, "created_at") else None,
        }
    except Exception:
        logger.warning("Failed to parse tweet", exc_info=True)
        return None


def _load_cookies_from_supabase() -> dict[str, str]:
    """Read cookies from the x_cookies table in Supabase."""
    sb = get_supabase()
    result = sb.table("x_cookies").select("*").eq("id", 1).single().execute()
    if not result.data:
        err_msg = getattr(result, "error", None)
        raise RuntimeError(
            f"No cookies found in Supabase ({err_msg or 'empty result'}). Go to /settings to add them."
        )
    data = result.data
    logger.info(f"Loaded cookies from Supabase (updated: {data.get('updated_at', '?')})")
    return {
        "auth_token": data["auth_token"],
        "ct0": data["ct0"],
        "twid": data.get("twid", ""),
    }


async def _get_client() -> Client:
    """Get an authenticated client using cookies from Supabase."""
    client = Client("en-US")
    cookies = _load_cookies_from_supabase()
    if not cookies.get("auth_token") or not cookies.get("ct0"):
        raise RuntimeError("X cookies are empty or missing. Go to /settings to update them.")
    client.set_cookies(cookies)
    # Verify cookies work by fetching user info
    try:
        await client.user()
        logger.info("Cookie auth verified successfully")
    except Exception:
        raise RuntimeError(
            "X cookies appear to be expired or invalid. Go to /settings to update them."
        )
    return client


async def _search(client: Client, queries: list[str]) -> list[dict[str, Any]]:
    """Search tweets for all queries with retry and backoff."""
    results: list[dict[str, Any]] = []
    consecutive_failures = 0

    for query in queries:
        # If too many consecutive failures, likely rate limited — stop early
        if consecutive_failures >= 3:
            logger.warning(f"Stopping search: {consecutive_failures} consecutive failures (likely rate limited)")
            break

        for attempt in range(3):
            try:
                logger.info(f"Searching: {query}")
                tweets = await client.search_tweet(query, product="Top")
                for tweet in tweets:
                    parsed = _parse_tweet(tweet)
                    if parsed:
                        results.append(parsed)
                consecutive_failures = 0
                await asyncio.sleep(3)
                break
            except Exception as e:
                err_msg = str(e).lower()
                is_rate_limit = "429" in err_msg or "rate" in err_msg or "too many" in err_msg
                if is_rate_limit and attempt < 2:
                    wait = (attempt + 1) * 15  # 15s, 30s
                    logger.warning(f"Rate limited on '{query}', waiting {wait}s (attempt {attempt + 1}/3)")
                    await asyncio.sleep(wait)
                else:
                    logger.warning(f"Query failed: {query}", exc_info=True)
                    consecutive_failures += 1
                    break

    return results


def _collect_queries() -> list[str]:
    """Gather all search queries from config, filtering to yesterday+today."""
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    queries: list[str] = []
    for cat_cfg in CATEGORIES.values():
        for q in cat_cfg.get("search_queries", []):
            queries.append(f"{q} since:{yesterday}")
    return queries


def _is_en_or_cn(text: str) -> bool:
    """Return True if text is primarily English or Chinese."""
    stripped = re.sub(r"https?://\S+|@\w+|#\w+", "", text)
    # Non-Latin scripts — reject if >= 5 chars
    foreign_script = len(re.findall(
        r"[\u3040-\u309f\u30a0-\u30ff"     # Japanese kana
        r"\u1100-\u11ff\uac00-\ud7af"       # Korean
        r"\u0e00-\u0e7f"                    # Thai
        r"\u0600-\u06ff"                    # Arabic
        r"\u0900-\u097f"                    # Devanagari
        r"\u0400-\u04ff"                    # Cyrillic
        r"\u1000-\u109f"                    # Myanmar
        r"\u0980-\u09ff]",                  # Bengali
        stripped
    ))
    if foreign_script >= 5:
        return False
    # Must have some English or Chinese content
    en_chars = len(re.findall(r"[a-zA-Z]", stripped))
    cn_chars = len(re.findall(r"[\u4e00-\u9fff]", stripped))
    return (en_chars + cn_chars) >= 5


async def fetch_tweets() -> list[dict[str, Any]]:
    """Fetch tweets, classify each, return list of dicts."""
    queries = _collect_queries()
    logger.info(f"Total queries: {len(queries)}")

    client = await _get_client()
    raw = await _search(client, queries)
    logger.info(f"Fetched {len(raw)} tweets")

    # Deduplicate by external_id before processing
    seen_ids: set[str] = set()
    unique: list[dict[str, Any]] = []
    for tweet in raw:
        eid = tweet.get("external_id", "")
        if not eid or eid in seen_ids:
            continue
        seen_ids.add(eid)
        unique.append(tweet)
    if len(raw) != len(unique):
        logger.info(f"Deduped {len(raw)} → {len(unique)} tweets")
    raw = unique

    # Filter spam, non-EN/CN languages, and classify
    clean: list[dict[str, Any]] = []
    spam_count = 0
    lang_count = 0
    for tweet in raw:
        text = tweet.get("content", "") or tweet.get("title", "")
        if is_spam(text):
            spam_count += 1
            continue
        if not _is_en_or_cn(text):
            lang_count += 1
            continue
        tweet["category"] = classify(text)
        clean.append(tweet)

    if spam_count:
        logger.info(f"Filtered {spam_count} spam tweets")
    if lang_count:
        logger.info(f"Filtered {lang_count} non-EN/CN tweets")

    return clean
