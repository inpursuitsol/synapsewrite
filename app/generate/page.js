// app/generate/page.js
"use client";

import React, { useState, useRef } from "react";

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

  const showToast = (msg = "") => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const copyToClipboard = async () => {
    if (!article) return showToast("Nothing to copy");
    try {
      await navigator.clipboard.writeText(article);
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed");
    }
  };

  const downloadMarkdown = () => {
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
  };

  const simulateGeneration = () => {
    if (!title.trim()) return showToast("Please enter a title or idea");
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

      const kwLine = keywords ? `\n\n**Keywords:** ${keywords}` : "";
      const sections = [
        `# ${title}`,
        "",
        `**TL;DR** — Quick summary.`,
        "",
        "## Context",
        "Why this matters and a short example.",
        "",
        "## Key points",
        "- Point 1\n- Point 2\n- Point 3",
        "",
        "## How to implement",
        "Step-by-step guidance.",
        "",
        "## Conclusion",
        "Wrap up and next steps."
      ];
      const multiplier = length === "short" ? 1 : length === "medium" ? 2 : 3;
      const final = Array.from({ length: multiplier }).map(() => sections.join("\n\n")).join("\n\n") + kwLine;
      setArticle(final);
      const base = 60 + Math.min(30, Math.floor(title.length / 2));
      const bonus = keywords ? 10 : 0;
      const rng = Math.floor(Math.random() * 10);
      setScore(Math.min(98, base + bonus + rng));
      setLoading(false);
      showToast("Article generated");
    }, wait);
  };

  const wordCount = (t) => (t ? t.trim().split(/\s+/).length : 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <section style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "Poppins, Inter, sans-serif", fontSize: 28, margin: 0 }}>Generate Article</h1>
        <p style={{ color: "#98a7b6", marginTop: 8 }}>
          Enter an idea, choose length, and click generate — the SEO panel updates on the right.
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title or idea"
              style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "inherit" }}
            />
            <select value={length} onChange={(e) => setLength(e.target.value)} style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "inherit" }}>
              <option value="short">Short (300–500)</option>
              <option value="medium">Medium (600–900)</option>
              <option value="long">Long (1200–1800)</option>
            </select>
          </div>

          <div style={{ marginTop: 10 }}>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Comma-separated keywords (optional)"
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "inherit" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <button
              onClick={simulateGeneration}
              disabled={loading}
              style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#7c5cff,#00d4ff)", color: "#021", fontWeight: 700, cursor: "pointer" }}
            >
              {loading ? "Generating…" : "Generate Article"}
            </button>

            <button onClick={copyToClipboard} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "inherit" }}>
              Copy
            </button>

            <button onClick={downloadMarkdown} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "inherit" }}>
              Download .md
            </button>

            <div style={{ marginLeft: "auto", color: "#98a7b6" }}>Words: <strong>{wordCount(article)}</strong></div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#98a7b6", fontSize: 13, marginBottom: 8 }}>Progress: {progress}%</div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.03)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#ffd86f,#7be29a)", transition: "width 300ms linear" }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Generated article preview</div>
                <div style={{ color: "#98a7b6", fontSize: 13 }}>Edit, copy, or download the markdown.</div>
              </div>
              <div style={{ color: "#98a7b6", fontSize: 13 }}>Status: {loading ? "Generating" : article ? "Ready" : "Idle"}</div>
            </div>

            <textarea
              ref={textRef}
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              rows={14}
              placeholder="Your generated article will appear here..."
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "inherit", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}
            />
          </div>
        </div>

        <aside style={{ position: "sticky", top: 92 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 10, border: "1px solid rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>SEO Score</div>
              <div style={{ color: "#98a7b6", fontSize: 13 }}>Realtime checks</div>
            </div>

            <div style={{ height: 10, background: "rgba(255,255,255,0.03)", borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
              <div style={{ height: "100%", width: `${score ?? 0}%`, background: "linear-gradient(90deg,#ffd86f,#7be29a)", transition: "width 300ms ease" }} />
            </div>

            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{score ?? "--"}</div>
            <div style={{ color: "#98a7b6", fontSize: 13, marginBottom: 12 }}>{score ? (score >= 80 ? "Excellent" : score >= 65 ? "Good" : "Needs work") : "Generate to evaluate"}</div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: 10 }}>
              <div style={{ color: "#98a7b6", fontSize: 13 }}>Quick checks</div>
              <ul style={{ marginTop: 8, color: "#98a7b6", lineHeight: 1.7 }}>
                <li>• Title length: {title.length > 10 ? "OK" : "Short"}</li>
                <li>• Keywords present: {keywords ? "Yes" : "No"}</li>
                <li>• Word count: {wordCount(article) > 500 ? "Good" : "Low"}</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a href="mailto:support@synapsewrite.io" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "inherit", textAlign: "center" }}>Contact support</a>
              <a href="/docs" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "inherit", textAlign: "center" }}>Docs</a>
            </div>
          </div>
        </aside>
      </div>

      {toast && <div style={{ position: "fixed", right: 22, bottom: 22, background: "#0b1721", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>{toast}</div>}
    </div>
  );
}
