"""Fetch notes from XHS (小红书) using the xhs library with cookies from Supabase."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from xhs import XhsClient
from xhs.core import SearchSortType, sign as xhs_sign

from playwright.async_api import async_playwright

from config import CATEGORIES
from classifier import classify, is_spam
from db import get_client as get_supabase

logger = logging.getLogger(__name__)


def _update_cookies_in_supabase(cookies: dict[str, str]) -> None:
    """Upsert refreshed XHS cookies back to Supabase."""
    try:
        sb = get_supabase()
        sb.table("xhs_cookies").upsert({
            "id": 1,
            "a1": cookies["a1"],
            "web_session": cookies["web_session"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        logger.info("Updated XHS cookies in Supabase")
    except Exception:
        logger.warning("Failed to update XHS cookies in Supabase", exc_info=True)


async def _refresh_cookies_via_playwright(cookies: dict[str, str]) -> dict[str, str]:
    """Use Playwright headless browser to refresh XHS cookies."""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            )
            await context.add_cookies([
                {"name": "a1", "value": cookies["a1"], "domain": ".xiaohongshu.com", "path": "/"},
                {"name": "web_session", "value": cookies["web_session"], "domain": ".xiaohongshu.com", "path": "/"},
            ])
            page = await context.new_page()
            await page.goto("https://www.xiaohongshu.com/explore", wait_until="networkidle")
            await page.wait_for_timeout(3000)

            browser_cookies = await context.cookies("https://www.xiaohongshu.com")
            refreshed = dict(cookies)  # copy original
            for c in browser_cookies:
                if c["name"] == "a1":
                    refreshed["a1"] = c["value"]
                elif c["name"] == "web_session":
                    refreshed["web_session"] = c["value"]

            await browser.close()

        if refreshed["a1"] != cookies["a1"] or refreshed["web_session"] != cookies["web_session"]:
            logger.info("XHS cookies refreshed via Playwright")
            _update_cookies_in_supabase(refreshed)
        else:
            logger.info("XHS cookies unchanged after Playwright refresh")

        return refreshed
    except Exception:
        logger.warning("Playwright cookie refresh failed, using original cookies", exc_info=True)
        return cookies


def _safe_int(val: Any) -> int:
    if val is None:
        return 0
    if isinstance(val, int):
        return val
    try:
        return int(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return 0


def _load_cookies_from_supabase() -> tuple[dict[str, str], str | None]:
    """Read XHS cookies from the xhs_cookies table in Supabase.

    Returns (cookies_dict, updated_at_iso_string_or_None).
    """
    sb = get_supabase()
    result = sb.table("xhs_cookies").select("*").eq("id", 1).single().execute()
    if not result.data:
        err_msg = getattr(result, "error", None)
        raise RuntimeError(
            f"No XHS cookies found in Supabase ({err_msg or 'empty result'}). Go to /settings to add them."
        )
    data = result.data
    updated_at = data.get("updated_at")
    logger.info(f"Loaded XHS cookies from Supabase (updated: {updated_at or '?'})")
    return {
        "a1": data["a1"],
        "web_session": data["web_session"],
    }, updated_at


COOKIE_REFRESH_INTERVAL = 3600  # seconds — skip Playwright if cookies are newer


async def _get_client() -> XhsClient:
    """Create an XhsClient with Playwright-refreshed cookies."""
    cookies, updated_at = _load_cookies_from_supabase()
    if not cookies.get("a1") or not cookies.get("web_session"):
        raise RuntimeError("XHS cookies are empty or missing. Go to /settings to update them.")

    # Skip Playwright refresh if cookies were updated recently
    skip_refresh = False
    if updated_at:
        try:
            updated_dt = datetime.fromisoformat(updated_at)
            age = (datetime.now(timezone.utc) - updated_dt).total_seconds()
            if age < COOKIE_REFRESH_INTERVAL:
                skip_refresh = True
                logger.info(f"Skipping Playwright refresh — cookies are {int(age)}s old (< {COOKIE_REFRESH_INTERVAL}s)")
        except (ValueError, TypeError):
            pass

    if not skip_refresh:
        cookies = await _refresh_cookies_via_playwright(cookies)

    cookie_str = f"a1={cookies['a1']}; web_session={cookies['web_session']}"

    # Wrap built-in sign to match the signature _pre_headers expects
    def sign_wrapper(url, data=None, a1="", web_session=""):
        return xhs_sign(url, data, a1=a1)

    client = XhsClient(cookie=cookie_str, sign=sign_wrapper)

    return client


def _parse_note(note: dict[str, Any]) -> dict[str, Any] | None:
    """Convert an XHS note dict into a flat article dict."""
    try:
        note_id = note.get("id") or note.get("note_id", "")
        if not note_id:
            return None

        title = note.get("display_title") or note.get("title") or ""
        desc = note.get("desc") or ""
        content = f"{title}\n{desc}".strip() if desc and desc != title else title

        user = note.get("user", {})
        author = user.get("nickname", "")
        user_id = user.get("user_id", "")

        # Cover image
        cover = note.get("cover", {})
        image_url = ""
        if isinstance(cover, dict):
            info_list = cover.get("info_list") or cover.get("url_default") or ""
            if isinstance(info_list, list) and info_list:
                image_url = info_list[-1].get("url", "")
            elif isinstance(info_list, str):
                image_url = info_list
            if not image_url:
                image_url = cover.get("url", "") or cover.get("url_default", "")

        # Engagement: map collected → views
        interact = note.get("interact_info", {})
        liked_count = _safe_int(interact.get("liked_count", 0))
        comment_count = _safe_int(interact.get("comment_count", 0))
        share_count = _safe_int(interact.get("share_count", 0))
        collected_count = _safe_int(interact.get("collected_count", 0))

        # Timestamp — XHS may return seconds or milliseconds
        timestamp = note.get("time") or note.get("last_update_time")
        published_at = None
        if timestamp:
            try:
                ts = int(timestamp)
                # If timestamp is in milliseconds (>= year 2001 in ms), convert to seconds
                if ts > 1_000_000_000_000:
                    ts = ts // 1000
                published_at = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
            except (ValueError, TypeError, OSError):
                pass

        return {
            "platform": "xhs",
            "external_id": str(note_id),
            "title": title[:100] if title else content[:100],
            "content": content,
            "author": author,
            "author_handle": user_id,
            "url": f"https://www.xiaohongshu.com/explore/{note_id}",
            "image_url": image_url,
            "likes": liked_count,
            "comments": comment_count,
            "shares": share_count,
            "views": collected_count,  # Map collected → views for scorer compatibility
            "published_at": published_at,
        }
    except Exception:
        logger.warning("Failed to parse XHS note", exc_info=True)
        return None


def _collect_queries() -> list[str]:
    """Gather all XHS search queries from config."""
    queries: list[str] = []
    for cat_cfg in CATEGORIES.values():
        for q in cat_cfg.get("search_queries_xhs", []):
            queries.append(q)
    return queries


def _search(client: XhsClient, queries: list[str]) -> list[dict[str, Any]]:
    """Search XHS notes for all queries."""
    import time

    results: list[dict[str, Any]] = []
    consecutive_failures = 0

    for query in queries:
        if consecutive_failures >= 3:
            logger.warning(f"Stopping XHS search: {consecutive_failures} consecutive failures")
            break

        try:
            logger.info(f"XHS searching: {query}")
            resp = client.get_note_by_keyword(
                keyword=query,
                page=1,
                sort=SearchSortType.GENERAL,
            )
            items = resp.get("items", [])
            for item in items:
                note_data = item.get("note_card", item)
                parsed = _parse_note(note_data)
                if parsed:
                    results.append(parsed)
            consecutive_failures = 0
            time.sleep(2)
        except Exception:
            logger.warning(f"XHS query failed: {query}", exc_info=True)
            consecutive_failures += 1
            time.sleep(5)

    return results


async def fetch_notes() -> list[dict[str, Any]]:
    """Fetch XHS notes, classify each, return list of dicts."""
    queries = _collect_queries()
    logger.info(f"XHS total queries: {len(queries)}")

    client = await _get_client()
    # Run sync HTTP calls in a thread to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(None, _search, client, queries)

    logger.info(f"Fetched {len(raw)} XHS notes")

    # Deduplicate by external_id
    seen_ids: set[str] = set()
    unique: list[dict[str, Any]] = []
    for note in raw:
        eid = note.get("external_id", "")
        if not eid or eid in seen_ids:
            continue
        seen_ids.add(eid)
        unique.append(note)
    if len(raw) != len(unique):
        logger.info(f"XHS deduped {len(raw)} → {len(unique)} notes")
    raw = unique

    # Filter spam and classify
    clean: list[dict[str, Any]] = []
    spam_count = 0
    for note in raw:
        text = note.get("content", "") or note.get("title", "")
        if is_spam(text):
            spam_count += 1
            continue
        note["category"] = classify(text)
        clean.append(note)

    if spam_count:
        logger.info(f"Filtered {spam_count} spam XHS notes")

    return clean
