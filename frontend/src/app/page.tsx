"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
interface NewsItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  importance_score: number;
  category: "ai" | "india" | "world";
  tier: "primary" | "suggested";
}

interface Enrichment {
  brief: string;
  why_it_matters: string;
  impact: string;
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const CAT: Record<string, { label: string; color: string; glow: string }> = {
  ai:    { label: "AI",    color: "#c0a060", glow: "rgba(192,160,96,0.3)" },
  india: { label: "India", color: "#a0b8d0", glow: "rgba(160,184,208,0.3)" },
  world: { label: "World", color: "#8090a8", glow: "rgba(128,144,168,0.3)" },
};

const TIER1 = ["reuters","bbc","associated press","ap news","financial times",
  "the guardian","new york times","washington post","the hindu","mint",
  "economic times","mit technology review","bloomberg","wall street journal"];
const TIER2 = ["techcrunch","wired","ndtv","times of india","ars technica",
  "the verge","venturebeat","forbes","fortune","business insider"];

function trust(source: string) {
  const s = source.toLowerCase();
  if (TIER1.some(t => s.includes(t))) return { color: "#a8c8a0", badge: "✓" };
  if (TIER2.some(t => s.includes(t))) return { color: "#8090a8", badge: "" };
  return { color: "#b8943c", badge: "?" };
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function fmtDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function readTime(text: string) {
  return `${Math.max(1, Math.round((text || "").split(" ").length / 200))} min`;
}

// ── NewsCard ──────────────────────────────────────────────────────────────────

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cat = CAT[item.category] ?? CAT.world;
  const t = trust(item.source);
  const dots = Math.round(item.importance_score / 2);

  async function analyse() {
    if (enrichment) { setExpanded(e => !e); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, summary: item.summary }),
      });
      setEnrichment(await res.json());
      setExpanded(true);
    } catch {
      setEnrichment({ brief: item.summary, why_it_matters: "Could not generate.", impact: "Unknown." });
      setExpanded(true);
    } finally { setLoading(false); }
  }

  return (
    <div className="card" style={{ animationDelay: `${index * 55}ms` }}>
      <div className="card-stripe" style={{ background: `linear-gradient(180deg, ${cat.color}, ${cat.color}88)` }} />
      <div className="card-inner">
        <div className="card-meta">
          <span className="cat-pill" style={{ color: cat.color, borderColor: `${cat.color}44`, background: `${cat.color}12` }}>
            {cat.label}
          </span>
          <span className="source-txt" style={{ color: t.color }}>
            {item.source}{t.badge && <span className="trust-mk"> {t.badge}</span>}
          </span>
          <span className="dots-row">
            {[1,2,3,4,5].map(i => (
              <span key={i} className="dot" style={{
                background: i <= dots ? cat.color : "rgba(255,255,255,0.08)",
                boxShadow: i <= dots ? `0 0 4px ${cat.glow}` : "none",
              }} />
            ))}
          </span>
          <span className="read-tm">{readTime(item.summary)}</span>
        </div>

        <a href={item.url} target="_blank" rel="noopener noreferrer" className="card-title"
          style={{ ["--hover-color" as string]: cat.color }}>
          {item.title}
        </a>

        {!expanded && <p className="card-summary">{item.summary}</p>}

        {expanded && enrichment && (
          <div className="enrich-box">
            <p className="enrich-brief">{enrichment.brief}</p>
            <div className="enrich-grid">
              <div className="enrich-cell">
                <p className="enrich-lbl">Why it matters</p>
                <p className="enrich-val">{enrichment.why_it_matters}</p>
              </div>
              <div className="enrich-cell">
                <p className="enrich-lbl">Impact</p>
                <p className="enrich-val">{enrichment.impact}</p>
              </div>
            </div>
          </div>
        )}

        <button className="analyse-btn" onClick={analyse} disabled={loading}>
          {loading ? <span className="spin">◌</span>
            : enrichment ? (expanded ? "↑ Collapse" : "↓ Analysis")
            : "✦ Analyse"}
        </button>
      </div>
    </div>
  );
}

// ── SuggestedRow ──────────────────────────────────────────────────────────────

function SuggestedRow({ item }: { item: NewsItem }) {
  const cat = CAT[item.category] ?? CAT.world;
  const t = trust(item.source);
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="sug-row">
      <span className="sug-dot" style={{ background: cat.color, boxShadow: `0 0 6px ${cat.glow}` }} />
      <span className="sug-title">{item.title}</span>
      <span className="sug-src" style={{ color: t.color }}>{item.source}</span>
    </a>
  );
}

// ── Todo ──────────────────────────────────────────────────────────────────────

function TodoSidebar() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    try { const s = localStorage.getItem("daft-todos"); if (s) setTodos(JSON.parse(s)); } catch {}
  }, []);

  function save(next: Todo[]) {
    setTodos(next);
    try { localStorage.setItem("daft-todos", JSON.stringify(next)); } catch {}
  }

  function add() {
    const text = input.trim();
    if (!text) return;
    save([...todos, { id: crypto.randomUUID(), text, done: false }]);
    setInput("");
  }

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);
  if (!ready) return null;

  return (
    <aside className="sidebar">
      <div className="sb-header">
        <span className="sb-title">Focus</span>
        <span className="sb-count">{pending.length} pending</span>
      </div>

      <div className="sb-input-row">
        <input className="sb-input" placeholder="Add task…" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()} />
        <button className="sb-add" onClick={add}>+</button>
      </div>

      <div className="sb-list">
        {pending.map(t => (
          <div key={t.id} className="sb-item">
            <button className="sb-chk"
              onClick={() => save(todos.map(x => x.id === t.id ? { ...x, done: true } : x))} />
            <span className="sb-txt"
              onClick={() => save(todos.map(x => x.id === t.id ? { ...x, done: true } : x))}>
              {t.text}
            </span>
            <button className="sb-del"
              onClick={() => save(todos.filter(x => x.id !== t.id))}>×</button>
          </div>
        ))}

        {done.length > 0 && (
          <>
            <div className="sb-divider" />
            {done.map(t => (
              <div key={t.id} className="sb-item sb-done">
                <button className="sb-chk sb-chk-done"
                  onClick={() => save(todos.map(x => x.id === t.id ? { ...x, done: false } : x))}>✓</button>
                <span className="sb-txt-done">{t.text}</span>
                <button className="sb-del"
                  onClick={() => save(todos.filter(x => x.id !== t.id))}>×</button>
              </div>
            ))}
          </>
        )}

        {todos.length === 0 && (
          <p className="sb-empty">Nothing yet.<br />What will you focus on today?</p>
        )}
      </div>
    </aside>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Filter = "all" | "ai" | "india" | "world";

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch(`${API_BASE}/news`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setNews(Array.isArray(data) ? data : [...(data.primary||[]), ...(data.suggested||[])]);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const filtered = (tier: string) =>
    news.filter(n => n.tier === tier && (filter === "all" || n.category === filter));

  const primary = filtered("primary");
  const suggested = filtered("suggested");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
  --bg:       #0e0b08;
  --surface:  #161210;
  --surface2: #1e1a16;
  --border:   #2a2420;
  --border2:  #3a3028;
  --text:     #e8e0d4;
  --muted:    #6a5e52;
  --faint:    #231e1a;
  --gold:     #c8a060;
  --gold2:    #a07840;
  --silver:   #c8a060;
  --silver2:  #a07840;
  --accent:   #c8a060;
  --accent2:  #7c4a20;
}

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Lora', Georgia, serif;
          min-height: 100vh;
          /* Subtle noise grain */
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
        }

        /* ── Glossy scrollbar ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: linear-gradient(var(--gold2), var(--silver2)); border-radius: 2px; }

        /* ── Layout ── */
        .page {
          display: grid;
          grid-template-columns: 1fr 210px;
          grid-template-rows: auto 1fr;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 28px;
          gap: 0 44px;
        }

        /* ── Header ── */
        .hdr {
          grid-column: 1 / -1;
          padding: 44px 0 28px;
          margin-bottom: 32px;
          border-bottom: 1px solid;
          border-image: linear-gradient(90deg, var(--gold2), var(--silver2), transparent) 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .hdr-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          background: linear-gradient(90deg, var(--gold), var(--silver));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .hdr-greeting {
          font-family: 'Syne', sans-serif;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1;
          background: linear-gradient(135deg, #e8e0d0 0%, var(--gold) 45%, #d4b888 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hdr-sub {
          font-family: 'Lora', serif;
          font-style: italic;
          font-size: 15px;
          color: var(--muted);
          margin-top: 4px;
        }

        .hdr-date {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          margin-top: 10px;
        }

        .hdr-stats {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          text-align: right;
          line-height: 2;
        }

        /* ── Filters ── */
        .filters {
          display: flex;
          gap: 6px;
          margin-bottom: 22px;
        }

        .f-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 5px 13px;
          border-radius: 3px;
          border: 1px solid var(--border2);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .f-btn:hover { color: var(--text); border-color: var(--muted); }

        .f-btn.active {
  background: linear-gradient(135deg, var(--gold2), #7a5828);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 12px rgba(192,160,96,0.25);
}

        /* ── Section label ── */
        .sec-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sec-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--border2), transparent);
        }

        /* ── Card ── */
        .card {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.45s ease forwards;
          position: relative;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }

        .card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
          pointer-events: none;
        }

        .card:hover {
          border-color: var(--border2);
          box-shadow: 0 6px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
          transform: translateY(-1px);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .card-stripe { width: 3px; flex-shrink: 0; opacity: 0.9; }

        .card-inner { padding: 16px 18px; flex: 1; min-width: 0; }

        .card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
          flex-wrap: wrap;
        }

        .cat-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 2px;
          border: 1px solid;
          font-weight: 500;
        }

        .source-txt {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
        }

        .trust-mk { opacity: 0.8; }

        .dots-row { display: flex; gap: 3px; align-items: center; }

        .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          display: inline-block;
          transition: all 0.2s;
        }

        .read-tm {
          margin-left: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--muted);
        }

        .card-title {
          display: block;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.42;
          color: var(--text);
          text-decoration: none;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
          transition: color 0.15s;
        }

        .card-title:hover { color: var(--gold); }

        .card-summary {
          font-size: 12px;
          line-height: 1.65;
          color: var(--muted);
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .analyse-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          color: var(--muted);
          background: transparent;
          border: 1px solid var(--border2);
          border-radius: 3px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .analyse-btn:hover:not(:disabled) {
          color: var(--gold);
          border-color: var(--gold2);
          box-shadow: 0 0 8px rgba(192,160,96,0.15);
        }

        .analyse-btn:disabled { opacity: 0.35; cursor: default; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { display: inline-block; animation: spin 1s linear infinite; }

        /* ── Enrichment ── */
        .enrich-box {
          margin-bottom: 12px;
          padding: 14px;
          background: var(--surface2);
          border-radius: 8px;
          border: 1px solid var(--border2);
          position: relative;
          overflow: hidden;
        }

        .enrich-box::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, var(--gold2), var(--silver2), transparent);
        }

        .enrich-brief {
          font-size: 13px;
          line-height: 1.65;
          color: var(--text);
          margin-bottom: 12px;
          font-style: italic;
        }

        .enrich-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

        .enrich-cell {
          background: var(--faint);
          border-radius: 6px;
          padding: 10px 12px;
          border: 1px solid var(--border);
        }

        .enrich-lbl {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 5px;
        }

        .enrich-val {
          font-size: 11px;
          line-height: 1.55;
          color: #9898b0;
        }

        /* ── Suggested ── */
        .sug-section { margin-top: 32px; }

        .sug-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 5px;
          text-decoration: none;
          transition: background 0.12s;
          border: 1px solid transparent;
        }

        .sug-row:hover {
          background: var(--surface);
          border-color: var(--border);
        }

        .sug-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 3px;
        }

        .sug-title {
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          color: #707088;
          flex: 1;
          line-height: 1.45;
          transition: color 0.15s;
        }

        .sug-row:hover .sug-title { color: var(--text); }

        .sug-src {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          flex-shrink: 0;
          opacity: 0.6;
        }

        /* ── Sidebar ── */
        .sidebar {
          position: sticky;
          top: 32px;
          align-self: start;
        }

        .sb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border);
        }

        .sb-title {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(90deg, var(--gold), var(--silver));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sb-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--muted);
        }

        .sb-input-row { display: flex; gap: 6px; margin-bottom: 12px; }

        .sb-input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: 5px;
          padding: 6px 9px;
          font-family: 'Lora', serif;
          font-size: 11px;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
          min-width: 0;
        }

        .sb-input:focus { border-color: var(--gold2); }
        .sb-input::placeholder { color: var(--muted); }

        .sb-add {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, var(--gold2), var(--silver2));
          border: none;
          border-radius: 5px;
          color: #fff;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.15s;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(192,160,96,0.2);
        }

        .sb-add:hover { opacity: 0.85; }

        .sb-list { display: flex; flex-direction: column; gap: 1px; }

        .sb-item {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          padding: 5px 3px;
          border-radius: 4px;
          transition: background 0.1s;
        }

        .sb-item:hover { background: var(--surface); }

        .sb-chk {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1px solid var(--border2);
          background: transparent;
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 2px;
          color: transparent;
          font-size: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .sb-chk:hover { border-color: var(--gold2); }

        .sb-chk-done {
          background: linear-gradient(135deg, var(--gold2), var(--silver2)) !important;
          border-color: transparent !important;
          color: #fff !important;
        }

        .sb-txt {
          font-size: 11px;
          line-height: 1.5;
          color: var(--text);
          flex: 1;
          cursor: pointer;
        }

        .sb-txt-done {
          font-size: 11px;
          line-height: 1.5;
          color: var(--muted);
          flex: 1;
          text-decoration: line-through;
        }

        .sb-del {
          background: none;
          border: none;
          color: transparent;
          cursor: pointer;
          font-size: 13px;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.1s;
        }

        .sb-item:hover .sb-del { color: var(--muted); }
        .sb-del:hover { color: #e05555 !important; }

        .sb-divider { height: 1px; background: var(--border); margin: 6px 0; }

        .sb-empty {
          font-size: 10px;
          color: var(--muted);
          line-height: 1.7;
          padding: 6px 3px;
          font-style: italic;
        }

        /* ── States ── */
        .state-loading {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--muted);
          padding: 60px 0;
          text-align: center;
          letter-spacing: 0.06em;
        }

        .state-error {
          background: #180a0a;
          border: 1px solid #3a1818;
          border-radius: 8px;
          padding: 18px 22px;
          color: #e07070;
          font-size: 12px;
          line-height: 1.6;
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>

      <div className="page">
        {/* Header */}
        <header className="hdr">
          <div>
            <p className="hdr-label">DAFT JUNK</p>
            <h1 className="hdr-greeting">{greeting()}.</h1>
            <p className="hdr-sub">Here&apos;s what mattered most.</p>
            <p className="hdr-date">{fmtDate()}</p>
          </div>
          <div className="hdr-stats">
  <a href="/life" style={{
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--gold)",
    textDecoration: "none",
    display: "block",
    marginBottom: 8,
  }}>Life Log →</a>
  {!loading && !error && (
    <>
      <div>{news.length} stories processed</div>
      <div>{primary.length} primary signals</div>
      <div>{suggested.length} in suggested</div>
    </>
  )}
</div>
        </header>

        {/* Feed */}
        <main>
          <div className="filters">
            {(["all","ai","india","world"] as Filter[]).map(f => (
              <button key={f} className={`f-btn${filter === f ? " active" : ""}`}
                onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>

          {loading && <div className="state-loading">Fetching signals…</div>}
          {error && <div className="state-error">Backend unreachable — is uvicorn running on port 8000?</div>}

          {!loading && !error && (
            <>
              {primary.length > 0 && (
                <>
                  <div className="sec-label">Top signals</div>
                  {primary.map((item, i) => <NewsCard key={item.url} item={item} index={i} />)}
                </>
              )}

              {suggested.length > 0 && (
                <div className="sug-section">
                  <div className="sec-label">You may also want to know</div>
                  {suggested.map(item => <SuggestedRow key={item.url} item={item} />)}
                </div>
              )}

              {primary.length === 0 && suggested.length === 0 && (
                <div className="state-loading">No stories for this filter right now.</div>
              )}
            </>
          )}
        </main>

        {/* Sidebar */}
        <TodoSidebar />
      </div>
    </>
  );
}