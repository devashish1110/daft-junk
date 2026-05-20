import json
import os
from datetime import datetime, date

ENTRIES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "entries")

def _ensure_dir():
    os.makedirs(ENTRIES_DIR, exist_ok=True)

def _entry_path(day: str) -> str:
    return os.path.join(ENTRIES_DIR, f"{day}.json")

def save_entry(entry: dict) -> dict:
    _ensure_dir()
    day = entry.get("date", date.today().isoformat())
    entry["saved_at"] = datetime.now().isoformat()
    with open(_entry_path(day), "w") as f:
        json.dump(entry, f, indent=2)
    return entry

def load_entry(day: str) -> dict | None:
    path = _entry_path(day)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)

def load_history(days: int = 30) -> list[dict]:
    _ensure_dir()
    entries = []
    for filename in sorted(os.listdir(ENTRIES_DIR), reverse=True):
        if filename.endswith(".json"):
            with open(os.path.join(ENTRIES_DIR, filename)) as f:
                try:
                    entries.append(json.load(f))
                except Exception:
                    continue
        if len(entries) >= days:
            break
    return entries