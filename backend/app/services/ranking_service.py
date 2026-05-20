"""
ranking_service.py — scores, categorises, and tiers articles.
"""

from typing import Literal
from datetime import datetime, timezone

# Specific compound phrases only — no single words that appear in non-AI context
AI_KEYWORDS = [
    "artificial intelligence", "machine learning", "deep learning",
    "neural network", "large language model", "foundation model",
    "generative ai", "diffusion model", "ai model", "ai research",
    "ai paper", "ai system", "ai tool", "ai startup", "ai company",
    "openai", "anthropic", "deepmind", "mistral", "hugging face",
    "chatgpt", "claude ai", "gemini ai", "gpt-4", "gpt-5",
    "llama model", "midjourney", "stable diffusion", "arxiv",
    "agi", "benchmark score", "language model", "copilot ai",
]

INDIA_KEYWORDS = [
    "india", "indian", "modi", "delhi", "mumbai", "bangalore", "bengaluru",
    "chennai", "hyderabad", "kolkata", "rupee", "bse", "nse", "sebi",
    "rbi", "isro", "bjp", "parliament", "lok sabha", "hindustan",
]
INDIA_SOURCES = [
    "ndtv", "the hindu", "economic times", "hindustan times",
    "indian express", "financial express", "mint", "livemint",
    "moneycontrol", "business standard", "india today", "scroll",
    "the wire", "firstpost", "news18", "deccan herald",
]


HIGH_IMPACT_KEYWORDS = [
    "breaking", "war", "conflict", "crisis", "emergency", "collapse",
    "sanction", "election", "summit", "treaty", "nuclear", "pandemic",
    "recession", "gdp", "federal reserve", "interest rate", "inflation",
    "earthquake", "flood", "hurricane", "assassination", "coup",
    "historic", "unprecedented", "breakthrough", "billion", "trillion",
    "ban", "regulation", "trade deal", "trade war", "embargo",
]

NOISE_KEYWORDS = [
    "celebrity", "gossip", "viral", "meme", "tiktok", "influencer",
    "reality tv", "award show", "fashion week", "horoscope",
]

SOURCE_TRUST: dict[str, float] = {
    "reuters": 1.0, "associated press": 1.0, "ap news": 1.0,
    "bbc": 0.95, "financial times": 0.95, "bloomberg": 0.95,
    "the guardian": 0.9, "new york times": 0.9, "washington post": 0.9,
    "wall street journal": 0.9, "the hindu": 0.9, "mit technology review": 0.9,
    "mint": 0.85, "economic times": 0.85, "ars technica": 0.85,
    "techcrunch": 0.8, "wired": 0.8, "the verge": 0.8,
    "ndtv": 0.8, "times of india": 0.8, "venturebeat": 0.75,
    "forbes": 0.75, "fortune": 0.75, "business insider": 0.7,
    "livemint": 0.85, "hindustan times": 0.8, "indian express": 0.8,
    "business standard": 0.8,
}

FEED_SOURCE_NAMES = {
    "raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news": "Anthropic",
    "openai.com": "OpenAI",
    "techcrunch.com": "TechCrunch",
    "venturebeat.com": "VentureBeat",
    "technologyreview.com": "MIT Technology Review",
    "bbci.co.uk": "BBC",
    "feedburner.com/ndtvnews": "NDTV",
    "thehindu.com": "The Hindu",
    "economictimes.indiatimes.com": "The Economic Times",
}
DEFAULT_TRUST = 0.65


def _text(article: dict) -> str:
    return f"{article.get('title', '')} {article.get('summary', '')}".lower()


def _get_category(text: str, source: str = "") -> Literal["ai", "india", "world"]:
    ai_hits = sum(1 for kw in AI_KEYWORDS if kw in text)
    india_hits = sum(1 for kw in INDIA_KEYWORDS if kw in text)

    # Check if it's from an Indian source — auto-tag as india
    source_lower = source.lower()
    is_india_source = any(s in source_lower for s in INDIA_SOURCES)

    if ai_hits >= 2:
        return "ai"
    if ai_hits == 1 and india_hits == 0:
        return "ai"
    if india_hits >= 2 or is_india_source:
        return "india"
    return "world"


def _get_source_trust(source: str) -> float:
    s = source.lower()
    for name, score in SOURCE_TRUST.items():
        if name in s:
            return score
    return DEFAULT_TRUST


def _get_impact_score(text: str) -> float:
    hits = sum(1 for kw in HIGH_IMPACT_KEYWORDS if kw in text)
    noise = sum(1 for kw in NOISE_KEYWORDS if kw in text)
    return max(0.0, min(1.0, (hits * 0.15) - (noise * 0.25)))


def _get_recency_score(published_at: str | None) -> float:
    if not published_at:
        return 0.5
    try:
        pub = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        hours_old = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
        if hours_old < 2:  return 1.0
        if hours_old < 6:  return 0.85
        if hours_old < 12: return 0.7
        if hours_old < 24: return 0.5
        return 0.3
    except Exception:
        return 0.5


def score_article(article: dict) -> dict:
    text = _text(article)
    source = article.get("source", "")
    trust = _get_source_trust(source)
    impact = _get_impact_score(text)
    recency = _get_recency_score(article.get("published_at"))
    category = _get_category(text, source)

    raw = (trust * 3.5) + (impact * 4.0) + (recency * 2.5)
    importance_score = round(min(10.0, raw), 1)

    # Tier threshold at 7.0 — only genuinely high signal goes primary
    tier: Literal["primary", "suggested"] = "primary" if importance_score >= 5.0 else "suggested"

    return {
        **article,
        "importance_score": importance_score,
        "category": category,
        "tier": tier,
    }


def rank_articles(articles: list[dict]) -> list[dict]:
    scored = [score_article(a) for a in articles]
    scored.sort(key=lambda a: a["importance_score"], reverse=True)

    # Only guarantee 1 primary per category — not 2
    # This keeps the bar high while ensuring all sections appear
    guaranteed: dict[str, int] = {"ai": 0, "india": 0, "world": 0}
    for a in scored:
        cat = a["category"]
        if guaranteed[cat] < 2:
            a["tier"] = "primary"
            guaranteed[cat] += 1

    return scored

def _get_feed_source_name(url: str) -> str:
    for key, name in FEED_SOURCE_NAMES.items():
        if key in url:
            return name
    return url.split("/")[2]  