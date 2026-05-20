import re
import os
import requests
import xml.etree.ElementTree as ET
from dotenv import load_dotenv
from app.services.ranking_service import rank_articles

load_dotenv()

API_KEY = os.getenv("GNEWS_API_KEY")

# ─── RSS Feed lists ───────────────────────────────────────────────────────────

RSS_FEEDS_AI = [
    "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml",
    "https://openai.com/news/rss.xml",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://venturebeat.com/category/ai/feed/",
    "https://www.technologyreview.com/feed/",
]

RSS_FEEDS_WORLD = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.bbci.co.uk/news/business/rss.xml",
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
]

RSS_FEEDS_INDIA = [
    "https://feeds.feedburner.com/ndtvnews-top-stories",
    "https://www.thehindu.com/feeder/default.rss",
    "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
]

# ─── Source name map ──────────────────────────────────────────────────────────

FEED_SOURCE_NAMES = {
    "feed_anthropic_news": "Anthropic",
    "openai.com": "OpenAI",
    "techcrunch.com": "TechCrunch",
    "venturebeat.com": "VentureBeat",
    "technologyreview.com": "MIT Technology Review",
    "bbci.co.uk/news/world": "BBC News",
    "bbci.co.uk/news/business": "BBC News",
    "bbci.co.uk/news/technology": "BBC News",
    "ndtvnews": "NDTV",
    "thehindu.com": "The Hindu",
    "economictimes.indiatimes.com": "The Economic Times",
}

TRUSTED_SOURCES = [
    "reuters", "bbc", "bbc news", "associated press", "ap news",
    "financial times", "the guardian", "new york times", "washington post",
    "bloomberg", "the economist", "wall street journal", "wsj",
    "techcrunch", "wired", "ars technica", "mit technology review",
    "the verge", "venturebeat", "ieee spectrum",
    "the hindu", "mint", "livemint", "economic times", "the economic times",
    "ndtv", "times of india", "business standard", "hindustan times",
    "indian express", "financial express", "moneycontrol",
    "deccan herald", "scroll", "the wire", "firstpost", "news18",
    "harvard business review", "fortune", "forbes", "fast company",
    "business insider", "npr",
    "anthropic", "openai",
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_feed_source_name(url: str) -> str:
    for key, name in FEED_SOURCE_NAMES.items():
        if key in url:
            return name
    return url.split("/")[2]


def is_trusted(source: str) -> bool:
    s = source.lower()
    return any(t in s for t in TRUSTED_SOURCES)


# ─── Fetchers ─────────────────────────────────────────────────────────────────

def fetch_rss(url: str) -> list:
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        content = resp.content.replace(b'\x00', b'')

        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            text = resp.content.decode("utf-8", errors="ignore")
            text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
            root = ET.fromstring(text.encode("utf-8"))

        source_name = _get_feed_source_name(url)
        articles = []

        for item in root.findall(".//item")[:8]:
            title = item.findtext("title", "").strip()
            summary = item.findtext("description", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "")

            summary = re.sub(r'<[^>]+>', '', summary).strip()

            if title and link:
                articles.append({
                    "title": title,
                    "summary": summary[:400] if summary else title,
                    "source": source_name,
                    "url": link,
                    "published_at": pub_date,
                })

        print(f"RSS {url[:55]} → {len(articles)} articles")
        return articles

    except Exception as e:
        print(f"RSS fetch failed {url[:55]}: {e}")
        return []


def fetch_from_url(url: str) -> list:
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code} | URL: {url[:80]}")

        if response.status_code != 200:
            print(f"Error: {response.text[:200]}")
            return []

        articles = response.json().get("articles", [])
        normalized = []

        for article in articles:
            source_name = article.get("source", {}).get("name", "")
            if not is_trusted(source_name):
                continue
            normalized.append({
                "title": article.get("title"),
                "summary": article.get("description"),
                "published_at": article.get("publishedAt"),
                "source": source_name,
                "url": article.get("url"),
            })

        print(f"Passed filter: {len(normalized)}")
        return normalized

    except Exception as e:
        print(f"fetch_from_url error: {e}")
        return []


# ─── Main ─────────────────────────────────────────────────────────────────────

def fetch_news():
    print("--- Fetching AI via RSS ---")
    ai_articles = []
    for feed in RSS_FEEDS_AI:
        ai_articles.extend(fetch_rss(feed))

    print("--- Fetching World via RSS ---")
    world_articles = []
    for feed in RSS_FEEDS_WORLD:
        world_articles.extend(fetch_rss(feed))

    print("--- Fetching India via RSS ---")
    india_articles = []
    for feed in RSS_FEEDS_INDIA:
        india_articles.extend(fetch_rss(feed))

    seen = set()
    combined = []
    for article in ai_articles + world_articles + india_articles:
        url = article.get("url", "")
        if url and url not in seen:
            seen.add(url)
            combined.append(article)

    print(f"--- Total: {len(combined)} ---")
    return rank_articles(combined)