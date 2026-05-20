from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import asyncio
from datetime import date
from app.services.ai_service import test_gemini, enrich_article, model
import os
import json

from app.services.news_service import fetch_news
from app.services.ai_service import test_gemini, enrich_article
from app.cache import save_cache, load_cache, cache_is_fresh

async def refresh_news():
    while True:
        print("--- Background refresh starting ---")
        try:
            articles = fetch_news()
            save_cache(articles)
            print(f"--- Cache saved: {len(articles)} articles ---")
        except Exception as e:
            print(f"--- Cache refresh failed: {e} ---")
        await asyncio.sleep(4 * 60 * 60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not cache_is_fresh(max_age_hours=4):
        asyncio.create_task(refresh_news())
    else:
        print("--- Cache is fresh, skipping startup fetch ---")
        # Schedule next refresh after remaining time
        asyncio.create_task(refresh_news())
    yield

app = FastAPI(title="DAFT Junk API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000""https://daft-junk.vercel.app",  # update after you get your Vercel URL
    "https://*.vercel.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/news")
def get_news():
    cached = load_cache()
    if cached:
        return cached["articles"]
    # Fallback to live fetch if no cache exists yet
    articles = fetch_news()
    save_cache(articles)
    return articles

@app.get("/cache-status")
def cache_status():
    cached = load_cache()
    if not cached:
        return {"status": "empty"}
    return {
        "status": "ok",
        "fetched_at": cached["fetched_at"],
        "article_count": len(cached["articles"])
    }

class EnrichRequest(BaseModel):
    title: str
    summary: str

@app.post("/enrich")
def enrich(req: EnrichRequest):
    return enrich_article(req.title, req.summary)

@app.get("/test-ai")
def test_ai():
    return {"response": test_gemini()}  

from app.services.life_service import save_entry, load_entry, load_history

class LifeEntry(BaseModel):
    date: str
    sleep_hours: float
    sleep_quality: int
    study_hours: float
    study_notes: str = ""
    workout: bool
    workout_type: str = ""
    cigarettes: int
    ate_clean: bool
    mood_score: int
    mood_word: str = ""
    journal: str = ""
    album_suggestion: str = ""   # ← add this
    album_rating: str = ""

@app.post("/life/log")
def log_entry(entry: LifeEntry):
    saved = save_entry(entry.model_dump())
    return {"status": "saved", "date": entry.date}

@app.get("/life/today")
def get_today():
    today = date.today().isoformat()
    entry = load_entry(today)
    return entry or {}

@app.get("/life/history")
def get_history(days: int = 30):
    return load_history(days)

@app.get("/life/streak")
def get_streak():
    history = load_history(90)
    streak = 0
    for entry in history:
        if entry.get("cigarettes", 1) == 0:
            streak += 1
        else:
            break
    return {"smoke_free_days": streak}

SUGGESTION_CACHE_FILE = "suggestion_cache.json"

@app.get("/life/suggestions")
def get_suggestions():
    today = date.today().isoformat()
    
    # Return cached suggestion if it's from today
    if os.path.exists(SUGGESTION_CACHE_FILE):
        with open(SUGGESTION_CACHE_FILE) as f:
            cached = json.load(f)
        if cached.get("date") == today:
            return cached["suggestion"]
    
    # Generate new suggestion
    history = load_history(90)
    rated = [e for e in history if e.get("album_rating")]
    rated_text = "\n".join([
        f"- {e.get('album_suggestion', 'Unknown')} → {e.get('album_rating')}"
        for e in rated[-10:]
    ]) or "No ratings yet."

    prompt = f"""You are a music and video curator for someone with this taste profile:

MUSIC THEY LOVE:
- Both Sides of the Sky — Jimi Hendrix
- Don't Be Dumb — ASAP Rocky
- More Life — Drake
- Wish You Were Here — Pink Floyd
- The Wall — Pink Floyd
- Magical Mystery Tour — The Beatles
- Beta — Peter Cat Recording Co
- Channel Orange — Frank Ocean
- Currents, The Slow Rush, Lonerism — Tame Impala
- Depression Cherry — Beach House

They are open to ALL genres. They value depth, emotion, atmosphere, originality.

THEIR RECENT ALBUM RATINGS:
{rated_text}

VIDEO TASTE — suggest ONE video per day, rotating through these categories:
- Category 1 (AI/Tech): Practical AI tutorials, how-to guides for tools like Claude, ChatGPT, Cursor, new AI workflows, AI productivity. Examples: "how to use Claude Projects", "build an AI agent", "best AI tools 2025"
- Category 2 (Philosophy/Self-improvement): Deep thinking, stoicism, psychology, becoming a better person, mindset, discipline, life frameworks. Examples: channels like Einzelganger, Academy of Ideas, Better Ideas, Pursuit of Wonder
- Category 3 (Video essays / Culture / Art): Deep dives into artists, musicians, filmmakers, cultural movements, art history, creative processes. Examples: channels like Polyphonic, Nerdwriter1, Like Stories of Old, Thomas Flight, Sage Hyden (Just Write), documentaries on artists like Basquiat, Warhol, Kanye, Kubrick, music legends- Category 4 (Economics / Business / MBA lens): How businesses work, economic history, case studies, market dynamics, entrepreneurship. Examples: channels like Wendover Productions, Half as Interesting, Company Man, Bloomberg Quicktake, Patrick Boyle
Rotate through these categories daily based on TODAY'S DATE — use the date to pick which category feels right. Do NOT suggest music or concert videos.

TODAY: {today}

Return ONLY a JSON object with exactly these fields:
{{
  "album_artist": "Artist name",
  "album_title": "Album title",
  "album_year": "Year",
  "album_genre": "Genre in 3-4 words",
  "album_why": "One sentence why this person would connect with this album",
  "album_rym_url": "https://rateyourmusic.com/release/album/artist/title/",
  "video_title": "Specific video title or topic to search",
"video_creator": "Channel name",  
"video_why": "One sentence — what they will learn or feel from this",
"video_search_query": "Exact YouTube search query to find it"
}}

Pick something niche and interesting. Do not suggest albums they already know."""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        suggestion = json.loads(text.strip())
        
        # Save to cache with today's date
        with open(SUGGESTION_CACHE_FILE, "w") as f:
            json.dump({"date": today, "suggestion": suggestion}, f)
        
        return suggestion
    except Exception as e:
        return {
            "album_artist": "Could not generate",
            "album_title": "Try again later",
            "album_year": "", "album_genre": "",
            "album_why": str(e),
            "album_rym_url": "https://rateyourmusic.com",
            "video_title": "NPR Tiny Desk Concerts",
            "video_creator": "NPR Music",
            "video_why": "Always worth watching.",
            "video_search_query": "NPR Tiny Desk Concert 2025"
        }
    
@app.get("/debug-rss")
def debug_rss():
    from app.services.news_service import fetch_rss
    ndtv = fetch_rss("https://feeds.feedburner.com/ndtvnews-top-stories")
    hindu = fetch_rss("https://www.thehindu.com/feeder/default.rss")
    et = fetch_rss("https://economictimes.indiatimes.com/rssfeedstopstories.cms")
    return {
        "ndtv": len(ndtv),
        "hindu": len(hindu),
        "economic_times": len(et),
    }