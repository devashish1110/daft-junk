"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
interface LifeEntry {
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  study_hours: number;
  study_notes: string;
  workout: boolean;
  workout_type: string;
  cigarettes: number;
  ate_clean: boolean;
  mood_score: number;
  mood_word: string;
  journal: string;
  album_suggestion: string;
  album_rating: string;
}

interface Suggestion {
  album_artist: string;
  album_title: string;
  album_year: string;
  album_genre: string;
  album_why: string;
  album_rym_url: string;
  video_title: string;
  video_creator: string;
  video_why: string;
  video_search_query: string;
}

const EMPTY: LifeEntry = {
  date: new Date().toISOString().split("T")[0],
  sleep_hours: 7, sleep_quality: 3, study_hours: 2, study_notes: "",
  workout: false, workout_type: "", cigarettes: 0, ate_clean: false,
  mood_score: 3, mood_word: "", journal: "", album_suggestion: "", album_rating: "",
};

const MOOD_WORDS = ["awful", "low", "okay", "good", "great"];
const WORKOUT_TYPES = ["gym", "run", "home", "sport", "walk"];
const RATINGS = [
  { key: "loved",      emoji: "♥", label: "Loved it",    color: "#60b880" },
  { key: "okay",       emoji: "~", label: "It's okay",   color: "#c8a060" },
  { key: "not for me", emoji: "✕", label: "Not for me",  color: "#e07060" },
  { key: "not yet",    emoji: "◷", label: "Not yet",     color: "#6a5e52" },
];

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function moodEmoji(score: number) {
  return ["", "😔", "😕", "😐", "🙂", "😊"][score] ?? "😐";
}

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stars">
        {[1,2,3,4,5].map(i => (
          <button key={i} className={"star" + (i <= value ? " star-on" : "")} onClick={() => onChange(i)}>★</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={"toggle" + (value ? " toggle-on" : "")} onClick={() => onChange(!value)}>
      <span className="toggle-dot" />
      <span className="toggle-label">{label}</span>
    </button>
  );
}

function MoodPicker({ score, word, onScore, onWord }: {
  score: number; word: string; onScore: (v: number) => void; onWord: (v: string) => void;
}) {
  return (
    <div className="field">
      <div className="field-header">
        <span className="field-label">Mood</span>
        <span className="field-value">{moodEmoji(score)} {word || MOOD_WORDS[score - 1]}</span>
      </div>
      <div className="mood-row">
        {[1,2,3,4,5].map(i => (
          <button key={i} className={"mood-btn" + (score === i ? " mood-active" : "")}
            onClick={() => { onScore(i); onWord(MOOD_WORDS[i-1]); }}>
            {moodEmoji(i)}
          </button>
        ))}
      </div>
      <input className="text-input" placeholder="One word (optional)…" value={word} onChange={e => onWord(e.target.value)} />
    </div>
  );
}

function HistoryCard({ entry }: { entry: LifeEntry }) {
  return (
    <div className="history-card">
      <div className="hc-date">{fmt(entry.date)}</div>
      <div className="hc-row">
        <span className="hc-stat">{"😴 " + entry.sleep_hours + "h"}</span>
        <span className="hc-stat">{"📚 " + entry.study_hours + "h"}</span>
        <span className="hc-stat">{entry.workout ? "💪 " + (entry.workout_type || "workout") : "🛋️ rest"}</span>
        <span className="hc-stat">{entry.cigarettes === 0 ? "🚭 clean" : "🚬 " + entry.cigarettes}</span>
        <span className="hc-stat">{entry.ate_clean ? "🥗 clean" : "🍔 off"}</span>
        <span className="hc-stat">{moodEmoji(entry.mood_score) + " " + (entry.mood_word || MOOD_WORDS[entry.mood_score - 1])}</span>
      </div>
      {entry.journal && (
        <p className="hc-journal">
          &ldquo;{entry.journal.slice(0, 140)}{entry.journal.length > 140 ? "…" : ""}&rdquo;
        </p>
      )}
    </div>
  );
}

function DiscoveryPanel({ currentEntry, onRate }: {
  currentEntry: LifeEntry;
  onRate: (rating: string, album: string) => void;
}) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [rated, setRated] = useState(currentEntry.album_rating || "");

  useEffect(() => {
    fetch(`{API_BASE}/life/suggestions`)
      .then(r => r.json())
      .then(d => { setSuggestion(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function rate(r: string) {
    setRated(r);
    if (suggestion) {
      onRate(r, suggestion.album_artist + " — " + suggestion.album_title);
    }
  }

  const ytUrl = suggestion
    ? "https://www.youtube.com/results?search_query=" + encodeURIComponent(suggestion.video_search_query)
    : "#";

  return (
    <aside className="discovery-col">
      <div className="disc-card">
        <div className="disc-header">
          <span className="disc-label">Album of the day</span>
        </div>
        {loading && <p className="disc-loading">Curating your suggestion…</p>}
        {!loading && suggestion && (
          <div>
            <a href={suggestion.album_rym_url} target="_blank" rel="noopener noreferrer" className="album-link">
              <div className="album-art"><span className="album-art-inner">♫</span></div>
              <div className="album-info">
                <p className="album-artist">{suggestion.album_artist}</p>
                <p className="album-title-txt">{suggestion.album_title}</p>
                <p className="album-meta">{suggestion.album_year + " · " + suggestion.album_genre}</p>
              </div>
            </a>
            <p className="album-why">{suggestion.album_why}</p>
            <div className="rating-row">
              {RATINGS.map(r => (
                <button
                  key={r.key}
                  className={"rating-btn" + (rated === r.key ? " rating-active" : "")}
                  style={{ outline: rated === r.key ? ("2px solid " + r.color) : "none", color: rated === r.key ? r.color : "#6a5e52" }}
                  onClick={() => rate(r.key)}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
            {rated && rated !== "not yet" && (
              <p className="rated-label">Marked as <strong>{rated}</strong> — next suggestion will adapt.</p>
            )}
          </div>
        )}
      </div>

      {!loading && suggestion && (
        <div className="disc-card" style={{ marginTop: 12 }}>
          <div className="disc-header">
            <span className="disc-label">Watch today</span>
          </div>
          <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="video-link">
            <div className="video-thumb">▶</div>
            <div className="video-info">
              <p className="video-title-txt">{suggestion.video_title}</p>
              <p className="video-creator">{suggestion.video_creator}</p>
            </div>
          </a>
          <p className="album-why">{suggestion.video_why}</p>
        </div>
      )}
    </aside>
  );
}

type Tab = "log" | "history";

export default function Life() {
  const [tab, setTab] = useState<Tab>("log");
  const [form, setForm] = useState<LifeEntry>(EMPTY);
  const [history, setHistory] = useState<LifeEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  function set<K extends keyof LifeEntry>(key: K, val: LifeEntry[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  useEffect(() => {
    setMounted(true);
    fetch(`${API_BASE}/life/today`).then(r => r.json()).then(d => { if (d.date) setForm(d); }).catch(() => {});
    fetch(`${API_BASE}/life/history`).then(r => r.json()).then(setHistory).catch(() => {});
    fetch(`${API_BASE}/life/streak`).then(r => r.json()).then(d => setStreak(d.smoke_free_days)).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/life/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetch(`${API_BASE}/life/history`).then(r => r.json()).then(setHistory);
      fetch(`${API_BASE}/life/streak`).then(r => r.json()).then(d => setStreak(d.smoke_free_days));
    } catch {
      alert("Could not save. Is the backend running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0e0b08; --surface: #161210; --surface2: #1e1a16;
          --border: #2a2420; --border2: #3a3028; --text: #e8e0d4;
          --muted: #6a5e52; --faint: #231e1a; --gold: #c8a060;
          --gold2: #a07840; --amber: #e8a030; --green: #60b880; --red: #e07060;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Lora', Georgia, serif; min-height: 100vh; }
        .page { max-width: 1080px; margin: 0 auto; padding: 48px 28px 80px; }
        .nav-link { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 32px; transition: color 0.15s; }
        .nav-link:hover { color: var(--gold); }
        .hdr { margin-bottom: 36px; }
        .hdr-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .hdr-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; background: linear-gradient(90deg, var(--gold), #d4b888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 6px; }
        .hdr-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(135deg, var(--text) 0%, var(--gold) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hdr-date { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 4px; }
        .streak-badge { display: flex; flex-direction: column; align-items: center; background: var(--surface); border: 1px solid var(--border2); border-radius: 12px; padding: 14px 22px; position: relative; overflow: hidden; }
        .streak-badge::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--gold2), var(--amber)); }
        .streak-num { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800; color: var(--amber); line-height: 1; }
        .streak-label { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
        .tabs { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 4px; }
        .tab { flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; padding: 8px; border-radius: 5px; border: none; background: transparent; color: var(--muted); cursor: pointer; transition: all 0.15s; }
        .tab.active { background: linear-gradient(135deg, var(--gold2), #7a5828); color: #fff; box-shadow: 0 2px 8px rgba(160,120,64,0.3); }
        .life-grid { display: grid; grid-template-columns: 1fr 300px; gap: 32px; align-items: start; }
        .discovery-col { position: sticky; top: 32px; }
        .section { margin-bottom: 28px; }
        .section-title { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
        .section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border2), transparent); }
        .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .fields-grid.single { grid-template-columns: 1fr; }
        .field { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; transition: border-color 0.15s; }
        .field:focus-within { border-color: var(--border2); }
        .field-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .field-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 8px; }
        .field-value { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--gold); }
        .slider { width: 100%; height: 3px; -webkit-appearance: none; background: var(--border2); border-radius: 2px; outline: none; cursor: pointer; }
        .slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: linear-gradient(135deg, var(--gold), var(--gold2)); box-shadow: 0 0 8px rgba(200,160,96,0.4); cursor: pointer; }
        .slider-marks { display: flex; justify-content: space-between; margin-top: 4px; font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--muted); }
        .stars { display: flex; gap: 4px; margin-top: 6px; }
        .star { font-size: 22px; background: none; border: none; cursor: pointer; color: var(--border2); transition: all 0.1s; line-height: 1; padding: 0; }
        .star-on { color: var(--gold); text-shadow: 0 0 8px rgba(200,160,96,0.5); }
        .star:hover { color: var(--gold); transform: scale(1.1); }
        .toggle { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: all 0.15s; width: 100%; }
        .toggle:hover { border-color: var(--border2); }
        .toggle-on { border-color: var(--green); background: rgba(96,184,128,0.06); }
        .toggle-dot { width: 32px; height: 18px; border-radius: 9px; background: var(--border2); position: relative; transition: background 0.2s; flex-shrink: 0; }
        .toggle-dot::after { content: ''; position: absolute; width: 12px; height: 12px; border-radius: 50%; background: var(--muted); top: 3px; left: 3px; transition: all 0.2s; }
        .toggle-on .toggle-dot { background: rgba(96,184,128,0.3); }
        .toggle-on .toggle-dot::after { background: var(--green); left: 17px; box-shadow: 0 0 6px rgba(96,184,128,0.5); }
        .toggle-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
        .toggle-on .toggle-label { color: var(--green); }
        .mood-row { display: flex; gap: 8px; margin: 8px 0; }
        .mood-btn { font-size: 22px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all 0.15s; flex: 1; }
        .mood-btn:hover { transform: scale(1.05); border-color: var(--border2); }
        .mood-active { border-color: var(--gold2); background: rgba(200,160,96,0.1); box-shadow: 0 0 10px rgba(200,160,96,0.2); }
        .text-input { width: 100%; background: transparent; border: none; border-top: 1px solid var(--border); padding: 8px 0 0; margin-top: 8px; font-family: 'Lora', serif; font-size: 13px; color: var(--text); outline: none; }
        .text-input::placeholder { color: var(--muted); font-style: italic; }
        .cig-counter { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
        .cig-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--border2); background: var(--surface2); color: var(--text); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .cig-btn:hover { border-color: var(--muted); }
        .cig-num { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; min-width: 32px; text-align: center; }
        .cig-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); }
        .workout-types { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .wt-btn { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border2); background: transparent; color: var(--muted); cursor: pointer; transition: all 0.15s; }
        .wt-btn.selected { border-color: var(--green); color: var(--green); background: rgba(96,184,128,0.08); }
        .journal-area { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; font-family: 'Lora', serif; font-size: 14px; line-height: 1.7; color: var(--text); outline: none; resize: vertical; min-height: 140px; transition: border-color 0.15s; }
        .journal-area:focus { border-color: var(--border2); }
        .journal-area::placeholder { color: var(--muted); font-style: italic; }
        .save-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--gold2), #7a5828); border: none; border-radius: 10px; color: #fff; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(160,120,64,0.3); margin-top: 8px; }
        .save-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .save-btn:disabled { opacity: 0.5; cursor: default; transform: none; }
        .save-btn.saved { background: linear-gradient(135deg, #408850, #306040); box-shadow: 0 4px 16px rgba(64,136,80,0.3); }
        .disc-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; position: relative; overflow: hidden; }
        .disc-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--gold2), var(--amber)); }
        .disc-header { margin-bottom: 14px; }
        .disc-label { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
        .disc-loading { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); font-style: italic; padding: 20px 0; text-align: center; }
        .album-link { display: flex; gap: 12px; text-decoration: none; margin-bottom: 12px; align-items: center; }
        .album-art { width: 64px; height: 64px; border-radius: 6px; background: linear-gradient(135deg, var(--gold2), #3a2810); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--border2); }
        .album-art-inner { font-size: 24px; opacity: 0.6; }
        .album-info { flex: 1; min-width: 0; }
        .album-artist { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold); margin-bottom: 3px; }
        .album-title-txt { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.3; margin-bottom: 4px; }
        .album-meta { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); }
        .album-why { font-size: 12px; font-style: italic; color: var(--muted); line-height: 1.6; margin-bottom: 14px; }
        .rating-row { display: flex; gap: 6px; margin-bottom: 8px; }
        .rating-btn { flex: 1; padding: 7px; border-radius: 6px; border: 1px solid var(--border2); background: transparent; font-size: 14px; cursor: pointer; transition: all 0.15s; color: var(--muted); }
        .rating-btn:hover { border-color: var(--gold); color: var(--gold); }
        .rated-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); text-align: center; }
        .video-link { display: flex; gap: 12px; text-decoration: none; margin-bottom: 12px; align-items: center; padding: 10px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border); transition: border-color 0.15s; }
        .video-link:hover { border-color: var(--border2); }
        .video-thumb { width: 48px; height: 48px; border-radius: 6px; background: #1a0808; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #e05555; flex-shrink: 0; border: 1px solid #3a1818; }
        .video-info { flex: 1; min-width: 0; }
        .video-title-txt { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.4; margin-bottom: 3px; }
        .video-creator { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); }
        .history-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; margin-bottom: 8px; transition: border-color 0.15s; }
        .history-card:hover { border-color: var(--border2); }
        .hc-date { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; color: var(--gold); margin-bottom: 10px; }
        .hc-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
        .hc-stat { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); background: var(--faint); padding: 3px 8px; border-radius: 4px; }
        .hc-journal { font-size: 12px; font-style: italic; color: var(--muted); line-height: 1.5; margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; }
        .empty { text-align: center; padding: 60px 0; color: var(--muted); font-style: italic; font-size: 14px; line-height: 1.8; }
      `}</style>

      <div className="page">
        <a href="/" className="nav-link">← Back to news</a>

        <div className="hdr">
          <div className="hdr-top">
            <div>
              <p className="hdr-label">DAFT — Personal OS</p>
              <h1 className="hdr-title">Life Log</h1>
              <p className="hdr-date">{mounted ? fmt(form.date) : ""}</p>
            </div>
            <div className="streak-badge">
              <span className="streak-num">{streak}</span>
              <span className="streak-label">🚭 smoke-free days</span>
            </div>
          </div>
          <div className="tabs">
            <button className={"tab" + (tab === "log" ? " active" : "")} onClick={() => setTab("log")}>Today&apos;s Log</button>
            <button className={"tab" + (tab === "history" ? " active" : "")} onClick={() => setTab("history")}>History ({history.length})</button>
          </div>
        </div>

        {tab === "log" && (
          <div className="life-grid">
            <div>
              <div className="section">
                <div className="section-title">Sleep</div>
                <div className="fields-grid">
                  <div className="field">
                    <div className="field-header">
                      <span className="field-label">Hours slept</span>
                      <span className="field-value">{form.sleep_hours}h</span>
                    </div>
                    <input type="range" min={0} max={12} step={0.5} value={form.sleep_hours}
                      onChange={e => set("sleep_hours", parseFloat(e.target.value))} className="slider" />
                    <div className="slider-marks"><span>0h</span><span>12h</span></div>
                  </div>
                  <StarRating label="Sleep quality" value={form.sleep_quality} onChange={v => set("sleep_quality", v)} />
                </div>
              </div>

              <div className="section">
                <div className="section-title">Study</div>
                <div className="fields-grid single">
                  <div className="field">
                    <div className="field-header">
                      <span className="field-label">Hours studied</span>
                      <span className="field-value">{form.study_hours}h</span>
                    </div>
                    <input type="range" min={0} max={12} step={0.5} value={form.study_hours}
                      onChange={e => set("study_hours", parseFloat(e.target.value))} className="slider" />
                    <div className="slider-marks"><span>0h</span><span>12h</span></div>
                    <input className="text-input" placeholder="What did you work on?"
                      value={form.study_notes} onChange={e => set("study_notes", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">Body</div>
                <div className="fields-grid">
                  <div>
                    <Toggle label={form.workout ? "Worked out ✓" : "No workout"} value={form.workout} onChange={v => set("workout", v)} />
                    {form.workout && (
                      <div className="workout-types">
                        {WORKOUT_TYPES.map(t => (
                          <button key={t} className={"wt-btn" + (form.workout_type === t ? " selected" : "")}
                            onClick={() => set("workout_type", t)}>{t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Toggle label={form.ate_clean ? "Ate clean ✓" : "Off track"} value={form.ate_clean} onChange={v => set("ate_clean", v)} />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <span className="field-label">Cigarettes today</span>
                  <div className="cig-counter">
                    <button className="cig-btn" onClick={() => set("cigarettes", Math.max(0, form.cigarettes - 1))}>−</button>
                    <span className="cig-num" style={{ color: form.cigarettes === 0 ? "var(--green)" : "var(--red)" }}>{form.cigarettes}</span>
                    <button className="cig-btn" onClick={() => set("cigarettes", form.cigarettes + 1)}>+</button>
                    <span className="cig-label">{form.cigarettes === 0 ? "🚭 clean day" : "🚬 " + form.cigarettes + " today"}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">Mind</div>
                <div className="fields-grid single">
                  <MoodPicker score={form.mood_score} word={form.mood_word}
                    onScore={v => set("mood_score", v)} onWord={v => set("mood_word", v)} />
                </div>
              </div>

              <div className="section">
                <div className="section-title">Journal</div>
                <textarea className="journal-area"
                  placeholder="How was today? What's on your mind? Any wins, frustrations, observations…"
                  value={form.journal} onChange={e => set("journal", e.target.value)} rows={6} />
              </div>

              <button className={"save-btn" + (saved ? " saved" : "")} onClick={save} disabled={saving}>
                {saving ? "Saving…" : saved ? "✓ Saved for today" : "Save today's log"}
              </button>
            </div>

            <DiscoveryPanel
              currentEntry={form}
              onRate={(rating, albumTitle) => {
                set("album_rating", rating);
                set("album_suggestion", albumTitle);
              }}
            />
          </div>
        )}

        {tab === "history" && (
          history.length === 0 ? (
            <div className="empty">No entries yet.<br />Start logging today and your history will build up here.</div>
          ) : (
            <div>{history.map(e => <HistoryCard key={e.date} entry={e} />)}</div>
          )
        )}
      </div>
    </>
  );
}