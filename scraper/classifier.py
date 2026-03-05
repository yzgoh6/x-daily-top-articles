"""Classify tweets into categories using weighted keyword scoring.

Each keyword has a weight (1-3). The category with the highest total
score wins, but only if it meets the minimum threshold.

Short keywords (<=3 chars) use word-boundary matching to avoid false
positives (e.g. "AI" won't match "said").
Multi-word phrases are matched as substrings (already specific enough).
"""

from __future__ import annotations

import re
from functools import lru_cache

from config import CATEGORIES, CATEGORY_PRIORITY, MIN_SCORE_THRESHOLD, SPAM_PATTERNS


@lru_cache(maxsize=1)
def _compiled_spam_patterns() -> list[re.Pattern[str]]:
    return [re.compile(p) for p in SPAM_PATTERNS]


def is_spam(text: str) -> bool:
    """Return True if text matches any spam pattern."""
    for pat in _compiled_spam_patterns():
        if pat.search(text):
            return True
    return False


def _build_pattern(keyword: str) -> re.Pattern[str]:
    """Build a regex pattern for a keyword.

    Short keywords (<=3 chars, all uppercase like AI, VC, NLP) use
    word-boundary matching. Multi-word or longer keywords use
    case-insensitive substring matching.
    """
    escaped = re.escape(keyword)
    if len(keyword) <= 3 and keyword.isupper():
        # Strict word boundary for short acronyms
        return re.compile(rf"\b{escaped}\b")
    else:
        return re.compile(escaped, re.IGNORECASE)


@lru_cache(maxsize=256)
def _get_pattern(keyword: str) -> re.Pattern[str]:
    return _build_pattern(keyword)


def classify(text: str) -> str:
    """Return the best-matching category for *text*.

    Scores each category by summing weights of matched keywords.
    Returns the highest-scoring category if it meets MIN_SCORE_THRESHOLD,
    otherwise 'Other'.
    """
    if not text:
        return "Other"

    scores: dict[str, int] = {}

    for category in CATEGORY_PRIORITY:
        total = 0
        for keyword, weight in CATEGORIES[category]["keywords"]:
            pattern = _get_pattern(keyword)
            if pattern.search(text):
                total += weight
        if total > 0:
            scores[category] = total

    if not scores:
        return "Other"

    best = max(scores, key=lambda c: scores[c])

    if scores[best] < MIN_SCORE_THRESHOLD:
        return "Other"

    return best
