"use client";

import React, { useState, useRef } from "react";

/**
 * Upgraded /generate page
 * - Cleaner, modern UI (Poppins + Inter)
 * - Clear top bar with Back to home and workspace title
 * - Large editor area, sticky SEO panel on the right
 * - Copy / Download / Generate buttons with state
 * - Accessible: keyboard-focusable, aria attributes
 *
 * Replace app/generate/page.js with this file.
 */

export default function GeneratePage() {
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [article, setArticle] = useState("");
  const [score, setScore] = useState(null);
  const [toast, setToast] = useState("");
  const textRef = useRef(null);

  function showToast(msg = "", time = 2200) {
    setToast(msg);
    setTimeout(() => setToast(""), time);
  }

  async function copyToClipboard() {
    if (!article) return showToast("Nothing to copy");
    try {
      await navigator.clipboard.writeText(article);
      showToast("Copied to clipboard");
    } catch (e) {
      showToast("Copy failed — try manually");
    }
  }

  function downloadMarkdown() {
    if (!article) return showToast("Nothing to download");
    const blob = new Blob([article], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (title ? title.replace(/\s+/g, "-").toLowerCase() : "article") + ".md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Download started");
  }

  function simulateGeneration() {
    if (!title.trim()) {
      showToast("Please enter a title or idea");
      return;
    }
    setArticle("");
    setScore(null);
    setLoading(true);
    setProgress(0);

    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 12) + 6;
      if (p >= 98) p = 98;
      setProgress(p);
    }, 300);

    const wait = length === "short" ? 900 : length === "long" ? 4200 : 2300;
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);

      // compact but richer article structure
      const kwLine = keywords ? `\n\n**Keywords:** ${keywords}` : "";
      const bodySections = [
        `# ${title}`,
        "",
        `**TL;DR** — A short summary that hooks the reader and explains what they'll learn.`,
        "",
        "## Context",
        "Background and why this topic matters. Include a human example and a brief stat.",
        "",
        "## Key concepts",
        "- Concept 1 — short explanation\n- Concept 2 — short explanation\n- Concept 3 — short explanation",
        "",
        "## How to implement",
        "Step 1: Do this.\nStep 2: Do that.\nStep 3: Measure outcomes.",
        "",
        "## Conclusion & next steps",
        "Wrap up and suggest actions for the reader."
      ];

      const multiplier = length === "short" ? 1 : length === "medium" ? 2 : 3;
      const full = Array.from({ length: multiplier }).map(() => bodySections.join("\n\n")).join("\n\n");
      const final = full + kwLine;
      setArticle(final);

      // nicer score logic
      const base = 60 + Math.min(30, Math.floor(title.length / 2));
      const bonus = keywords ? 10 : 0;
      const rng = Math.floor(Math.random() * 10);
      const finalScore = Math.min(98, base + bonus + rng);
      setScore(finalScore);
      setLoading(false);
      showToast("Article generated");
    }, wait);
  }

  const wordCount = (t) => (t ? t.trim().split(/\s+/).length : 0);

  return (
    <div className="gw-root">
      <style>{`
        /* Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Poppins:wght@600;700&display=swap');

        :root{
          --bg:#06111a;
          --card:#071826;
          --muted:#98a7b6;
          --accent-1: #7c5cff;
          --accent-2: #00d4ff;
          --glass: rgba(255,255,255,0.03);
          --panel: rgba(255,255,255,0.02);
          --surface: rgba(255,255,255,0.025);
          --white: #eef6fb;
          --success: #7be29a;
        }

        .gw-root{font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; background:linear-gradient(180deg,var(--bg),#031018 60%); min-height:100vh; color:var(--white); padding:22px 28px;}
        .gw-topbar{display:flex;align-items:center;gap:14px;margin-bottom:18px}
        .gw-back{display:inline-flex;align-items:center;gap:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);padding:8px 12px;border-radius:10px;color:var(--white);text-decoration:none}
        .gw-badge{font-family:Poppins, Inter; font-weight:600; font-size:18px}
        .gw-sub{color:var(--muted);font-size:13px;margin-left:6px}

        .gw-container{max-width:1200px;margin:0 auto}
        .gw-hero{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px}
        .gw-hero-left{flex:1}
        .gw-page-title{font-family:Poppins, Inter;font-weight:700;font-size:26px;margin:0;padding:0}
        .gw-lead{color:var(--muted);margin-top:6px;font-size:14px}

        /* layout */
        .gw-main{display:grid;grid-template-columns:1fr 360px;gap:20px;margin-top:8px;align-items:start}
        @media (max-width:980px){ .gw-main{grid-template-columns:1fr} .gw-aside{position:static;top:auto} }

        /* editor */
        .gw-panel{background:var(--surface);border-radius:12px;padding:18px;border:1px solid rgba(255,255,255,0.03);box-shadow:0 12px 30px rgba(2,6,23,0.6)}
        .gw-form{display:grid;grid-template-columns:1fr 220px;gap:10px;margin-bottom:12px}
        .gw-form .input, .gw-form .select{padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--white);font-size:14px}
        .gw-form .input::placeholder{color:rgba(255,255,255,0.24)}
        .gw-row{display:flex;align-items:center;gap:10px;margin:12px 0}
        .gw-btn{border-radius:10px;padding:10px 14px;border:none;cursor:pointer;font-weight:700}
        .gw-btn.primary{background:linear-gradient(90deg,var(--accent-1),var(--accent-2));color:#021}
        .gw-btn.ghost{background:transparent;border:1px solid rgba(255,255,255,0.04);color:var(--white)}
        .gw-progress-wrap{margin-top:8px}
        .gw-progress{height:8px;background:rgba(255,255,255,0.04);border-radius:999px;overflow:hidden}
        .gw-progress > .fill{height:100%;background:linear-gradient(90deg,var(--accent-1),var(--accent-2));transition:width 300ms linear}

        .gw-editor{min-height:420px;border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,0.04);background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.008)); resize:vertical; width:100%; color:var(--white); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace }

        /* aside */
        .gw-aside{position:sticky;top:96px;height:fit-content}
        .gw-aside .card{padding:16px;border-radius:10px;background:var(--panel);border:1px solid rgba(255,255,255,0.02)}
        .gw-score-bar{height:10px;background:rgba(255,255,255,0.03);border-radius:999px;overflow:hidden;margin:12px 0}
        .gw-score-fill{height:100%;background:linear-gradient(90deg,#ffd86f,#7be29a);transition:width 300ms ease}

        .muted{color:var(--muted);font-size:13px}
        .small{font-size:13px}
        .kw-pill{display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.02);font-weight:600}

        /* footer actions under editor for mobile */
        @media (max-width:980px){
          .gw-actions-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
          .gw-aside{order:2}
        }

        /* toast */
        .gw-toast{position:fixed;right:22px;bottom:22px;background:#0b1721;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);box-shadow:0 8px 30px rgba(2,6,23,0.6)}
      `}</style>

      <div className="gw-container">
        {/* Top integrated header */}
        <div className="gw-topbar">
          <a className="gw-back" href="/" aria-label="Back to home">
            ← Home
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="gw-badge">SynapseWrite</div>
            <div className="gw-sub">AI writing co-pilot</div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <a href="/"
              className="gw-btn ghost"
              title="Open dashboard"
              style={{ fontWeight: 600, padding: "8px 12px", borderRadius: 10 }}
            >
              Dashboard
            </a>
          </div>
        </div>

        {/* Page header */}
        <div className="gw-hero">
          <div className="gw-hero-left">
            <h1 className="gw-page-title">Generate Article</h1>
            <div className="gw-lead">Create publishable articles instantly. Enter an idea, pick a length, and click generate.</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="kw-pill">Workspace: Beta</div>
            <a href="/generate" className="gw-btn ghost" style={{ whiteSpace: "nowrap" }}>
              New draft
            </a>
          </div>
        </div>

        {/* Main area */}
        <div className="gw-main">
          <div className="gw-panel" aria-labelledby="generate-section">
            {/* Inputs */}
            <div className="gw-form" role="form" aria-label="Generate article form">
              <input
                className="input"
                placeholder="Enter article title or idea"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Article title or idea"
                autoFocus
              />
              <select className="select" value={length} onChange={(e) => setLength(e.target.value)} aria-label="Length">
                <option value="short">Short (300–500)</option>
                <option value="medium">Medium (600–900)</option>
                <option value="long">Long (1200–1800)</option>
              </select>

              {/* keywords row below spanning full width */}
            </div>

            <div style={{ marginTop: 10 }}>
              <input
                className="input"
                placeholder="Comma-separated keywords (optional)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                aria-label="Keywords"
              />
            </div>

            {/* Buttons */}
            <div className="gw-row" style={{ marginTop: 12 }}>
              <button
                className="gw-btn primary"
                onClick={simulateGeneration}
                disabled={loading}
                aria-disabled={loading}
                aria-label="Generate Article"
              >
                {loading ? `Generating…` : "Generate Article"}
              </button>

              <button className="gw-btn ghost" onClick={copyToClipboard} aria-label="Copy article">
                Copy
              </button>

              <button className="gw-btn ghost" onClick={downloadMarkdown} aria-label="Download markdown">
                Download .md
              </button>

              <div style={{ marginLeft: "auto", color: "var(--muted)" }} className="small">
                Words: <strong>{wordCount(article)}</strong>
              </div>
            </div>

            {/* progress */}
            <div className="gw-progress-wrap" aria-hidden>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}><strong>Progress:</strong> {progress}%</div>
              <div className="gw-progress" style={{ marginTop: 8 }}>
                <div className="fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Editor */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Generated article preview</div>
                  <div className="muted small">Edit, copy, or download the markdown.</div>
                </div>
                <div className="muted small">Status: {loading ? "Generating" : article ? "Ready" : "Idle"}</div>
              </div>

              <textarea
                ref={textRef}
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                rows={18}
                className="gw-editor"
                placeholder="Your generated article will appear here..."
                aria-label="Generated article"
              />
            </div>
          </div>

          {/* Sticky SEO / meta panel */}
          <aside className="gw-aside">
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>SEO Score</div>
                <div className="muted small">Realtime checks</div>
              </div>

              <div className="gw-score-bar" aria-hidden>
                <div className="gw-score-fill" style={{ width: `${score ?? 0}%` }} />
              </div>

              <div style={{ fontSize: 28, fontWeight: 800 }}>{score ?? "--"}</div>
              <div className="muted small" style={{ marginBottom: 12 }}>
                {score ? (score >= 80 ? "Excellent" : score >= 65 ? "Good" : "Needs work") : "Generate to evaluate"}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: 10 }}>
                <div className="muted small">Quick checks</div>
                <ul style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.7 }}>
                  <li>• Title length: {title.length > 10 ? "OK" : "Short"}</li>
                  <li>• Keywords present: {keywords ? "Yes" : "No"}</li>
                  <li>• Word count: {wordCount(article) > 500 ? "Good" : "Low"}</li>
                </ul>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <a href="mailto:support@synapsewrite.io" className="gw-btn ghost" style={{ flex: 1 }}>Contact support</a>
                <a href="/" className="gw-btn ghost" style={{ flex: 1 }}>Docs</a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* toast */}
      {toast && <div className="gw-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}
