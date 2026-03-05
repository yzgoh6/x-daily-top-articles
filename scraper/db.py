"""Write articles to Supabase."""

from __future__ import annotations

import os
from typing import Any

from supabase import create_client, Client


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def upsert_articles(articles: list[dict[str, Any]]) -> int:
    """Upsert articles into the articles table.

    Returns the number of rows written.
    """
    if not articles:
        return 0

    client = get_client()

    rows = []
    for a in articles:
        eid = a.get("external_id")
        batch = a.get("fetch_batch")
        if not eid or not batch:
            continue
        rows.append({
            "platform": a.get("platform", "x"),
            "external_id": eid,
            "title": a.get("title", ""),
            "content": a.get("content", ""),
            "author": a.get("author", ""),
            "author_handle": a.get("author_handle", ""),
            "url": a.get("url", ""),
            "image_url": a.get("image_url", ""),
            "category": a.get("category", "Other"),
            "likes": a.get("likes", 0),
            "comments": a.get("comments", 0),
            "shares": a.get("shares", 0),
            "views": a.get("views", 0),
            "engagement_score": a.get("engagement_score", 0),
            "published_at": a.get("published_at"),
            "fetch_batch": batch,
        })

    if not rows:
        return 0

    result = (
        client.table("articles")
        .upsert(rows, on_conflict="platform,external_id,fetch_batch")
        .execute()
    )
    return len(result.data) if result.data else 0
