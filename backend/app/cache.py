import json
import os
from datetime import datetime, timezone

CACHE_FILE = "news_cache.json"

def save_cache(articles: list) -> None:
    data = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "articles": articles
    }
    with open(CACHE_FILE, "w") as f:
        json.dump(data, f)

def load_cache() -> dict | None:
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return None

def cache_is_fresh(max_age_hours: int = 4) -> bool:
    data = load_cache()
    if not data:
        return False
    try:
        fetched = datetime.fromisoformat(data["fetched_at"])
        age = (datetime.now(timezone.utc) - fetched).total_seconds() / 3600
        return age < max_age_hours
    except Exception:
        return False