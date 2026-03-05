"""Fetch tweets from X using twikit with cookies from Supabase."""

from __future__ import annotations

import asyncio
import os
import logging
import re
from datetime import datetime, timezone
from typing import Any

from twikit import Client

from config import CATEGORIES
from classifier import classify, is_spam
from db import get_client as get_supabase

logger = logging.getLogger(__name__)


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
            "views": getattr(tweet, "view_count", 0) or 0,
            "published_at": tweet.created_at if hasattr(tweet, "created_at") else None,
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
    client.set_cookies(cookies)
    return client


async def _search(client: Client, queries: list[str]) -> list[dict[str, Any]]:
    """Search tweets for all queries."""
    results: list[dict[str, Any]] = []

    for query in queries:
        try:
            logger.info(f"Searching: {query}")
            tweets = await client.search_tweet(query, product="Top")
            for tweet in tweets:
                parsed = _parse_tweet(tweet)
                if parsed:
                    results.append(parsed)
            await asyncio.sleep(3)
        except Exception:
            logger.warning(f"Query failed: {query}", exc_info=True)
            continue

    return results


def _collect_queries() -> list[str]:
    """Gather all search queries from config, adding today's date filter."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    queries: list[str] = []
    for cat_cfg in CATEGORIES.values():
        for q in cat_cfg.get("search_queries", []):
            queries.append(f"{q} since:{today}")
    return queries


def _is_en_or_cn(text: str) -> bool:
    """Return True if text is primarily English or Chinese (no Japanese/Korean/Thai/etc)."""
    stripped = re.sub(r"https?://\S+|@\w+|#\w+", "", text)
    # Japanese kana = definite Japanese
    ja_chars = len(re.findall(r"[\u3040-\u309f\u30a0-\u30ff]", stripped))
    # Korean
    ko_chars = len(re.findall(r"[\u1100-\u11ff\uac00-\ud7af]", stripped))
    # Thai
    th_chars = len(re.findall(r"[\u0e00-\u0e7f]", stripped))
    # Arabic, Devanagari, Cyrillic
    other_chars = len(re.findall(r"[\u0600-\u06ff\u0900-\u097f\u0400-\u04ff]", stripped))
    # If any non-EN/CN script has significant presence, reject
    foreign = ja_chars + ko_chars + th_chars + other_chars
    if foreign >= 3:
        return False
    # Check there's some English or Chinese content
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

    # Filter spam, non-EN/CN languages, and classify
    clean: list[dict[str, Any]] = []
    spam_count = 0
    lang_count = 0
    for tweet in raw:
        text = f"{tweet.get('title', '')} {tweet.get('content', '')}"
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
