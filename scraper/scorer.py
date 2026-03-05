"""Score and rank tweets by engagement."""

from __future__ import annotations
from typing import Any


def compute_score(tweet: dict[str, Any]) -> float:
    """Engagement score: likes*1 + comments*3 + shares*5 + views*0.01"""
    likes = int(tweet.get("likes", 0) or 0)
    comments = int(tweet.get("comments", 0) or 0)
    shares = int(tweet.get("shares", 0) or 0)
    views = int(tweet.get("views", 0) or 0)
    return likes * 1 + comments * 3 + shares * 5 + views * 0.01


def rank_and_trim(tweets: list[dict[str, Any]], top_n: int = 50) -> list[dict[str, Any]]:
    """Score each tweet, sort descending, keep top_n."""
    for t in tweets:
        t["engagement_score"] = compute_score(t)

    tweets.sort(key=lambda t: t["engagement_score"], reverse=True)
    return tweets[:top_n]
