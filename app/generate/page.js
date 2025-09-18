"use client";

import React, { useState } from "react";

export default function GeneratePage() {
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [article, setArticle] = useState("");
  const [score, setScore] = useState(null);

  function simulateGeneration() {
    if (!title.trim()) {
      alert("Please enter a title or idea first.");
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

    const wait = length === "short" ? 1200 : length === "long" ? 4200 : 2600;
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);

      const kw = keywords ? `\n\n**Keywords:** ${keywords}` : "";
      const body = [
        `# ${title}`,
        "",
        "Intro: This article explores the topic and provides practical insights, examples, and recommended next steps.",
        "",
        "## What you need to know",
        "A concise explainer paragraph that covers the essentials for readers who want a quick summary.",
        "",
        "## How to implement",
        "Step-by-step guidance, code samples, or actionable instructions that readers can follow.",
        "",
        "## Conclusion",
        "A brief wrap-up and call-to-action to help readers move forward."
      ].join("\n\n");

      const multiplier = length === "short" ? 1 : length === "medium" ? 2 : 3;
      const articleText = Array.from({ length: multiplier })
        .map(() => body)
        .join("\n\n");

      setArticle(articleText + kw);
      const base = Math.min(95, Math.max(60, 70 + (title.length % 25) + (keywords ? 8 : 0)));
      const finalScore = Math.min(100, base + Math.floor(Math.random() * 15));
      setScore(finalScore);
      setLoading(false);
    }, wait);
  }

  function downloadMarkdown() {
    if (!article) return;
    const blob = new Blob([article], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (title ? title.replace(/\s+/g, "-").toLowerCase() : "article") + ".md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const wordCount = (text) => (text ? text.trim().split(/\s+/).length : 0);

  return (
    <div className="gen-root">
      <div className="gen-container">
        <h1>Generate Article</h1>

        <div className="gen-form">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter article title or idea" />
          <select value={length} onChange={(e) => setLength(e.target.value)}>
            <option value="short">Short (300-500)</option>
            <option value="medium">Medium (600-900)</option>
            <option value="long">Long (1200-1800)</option>
          </select>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Comma-separated keywords (optional)" />
        </div>

        <div className="gen-actions">
          <button onClick={simulateGeneration} disabled={loading} className="gen-primary">
            {loading ? "Generating…" : "Generate Article"}
          </button>
          <button onClick={downloadMarkdown} disabled={!article}>Download .md</button>
          <div className="gen-words">Words: <strong>{wordCount(article)}</strong></div>
        </div>

        <div className="gen-progress">
          <div className="bar">
            <div className="bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="gen-muted">Progress: {progress}%</div>
        </div>

        <div className="gen-grid">
          <div className="gen-article">
            <div className="gen-header">
              <div>
                <div className="gen-muted">Generated article preview</div>
                <div className="gen-small">Edit, copy, or download the markdown.</div>
              </div>
              <div className="gen-muted">Status: {loading ? "Generating" : article ? "Ready" : "Idle"}</div>
            </div>

            <textarea value={article} onChange={(e) => setArticle(e.target.value)} rows={16} />
          </div>

          <aside className="gen-aside">
            <div className="gen-muted">SEO Score</div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${score ?? 0}%` }} />
            </div>
            <div className="score-number">{score ?? "--"}</div>
            <div className="gen-small">{score ? (score >= 80 ? "Excellent" : score >= 65 ? "Good" : "Needs work") : "Generate to evaluate"}</div>

            <div className="checks">
              <div>• Title length: {title.length > 10 ? "OK" : "Short"}</div>
              <div>• Keywords present: {keywords ? "Yes" : "No"}</div>
              <div>• Word count: {wordCount(article) > 500 ? "Good" : "Low"}</div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .gen-root{min-height:72vh;padding:24px;background:linear-gradient(180deg,#071021,#04101a);color:#eef2f7;font-family:Inter,system-ui,Arial,sans-serif}
        .gen-container{max-width:980px;margin:0 auto}
        h1{font-size:22px;margin-bottom:12px}
        .gen-form{display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:12px}
        .gen-form input,.gen-form select{padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#eef2f7}
        .gen-actions{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .gen-primary{background:linear-gradient(90deg,#7c5cff,#00d4ff);color:#021;padding:10px 14px;border-radius:8px;border:none;font-weight:700}
        .gen-words{margin-left:auto;color:#9aa8bd}
        .gen-progress .bar{height:8px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;margin-bottom:6px}
        .bar-fill{height:100%;background:linear-gradient(90deg,#f6c84d,#41d07f);transition:width 300ms linear}
        .gen-grid{display:grid;grid-template-columns:2fr 1fr;gap:12px}
        .gen-article{background:rgba(255,255,255,0.025);padding:12px;border-radius:8px}
        textarea{width:100%;background:transparent;border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#eef2f7;padding:10px;font-family:monospace}
        .gen-aside{background:rgba(255,255,255,0.025);padding:12px;border-radius:8px;text-align:center}
        .score-bar{height:12px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;margin:8px 0}
        .score-fill{height:100%;background:linear-gradient(90deg,#ffd86f,#7be29a)}
        .score-number{font-weight:800;font-size:24px;margin-bottom:6px}
        .gen-muted{color:#9aa8bd}
        .gen-small{font-size:12px;color:#9aa8bd}
        .checks{margin-top:10px;color:#cfd9e3;text-align:left}
        @media (max-width:900px){ .gen-form{grid-template-columns:1fr; } .gen-grid{grid-template-columns:1fr} .gen-words{margin-left:0} }
      `}</style>
    </div>
  );
}
