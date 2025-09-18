// app/generate/page.js
"use client";

import { useState, useRef } from "react";

export default function GeneratePage() {
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [article, setArticle] = useState("");
  const [score, setScore] = useState(null);
  const textRef = useRef(null);

  const wordCount = (t) => (t ? t.trim().split(/\s+/).length : 0);

  function toast(msg) {
    // simple ephemeral visual feedback via alert fallback if needed
    try { window.__synapse_toast && window.__synapse_toast(msg); } catch {}
  }

  function downloadMarkdown() {
    if (!article) return toast("Nothing to download");
    const blob = new Blob([article], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (title ? title.replace(/\s+/g, "-").toLowerCase() : "article") + ".md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Download started");
  }

  async function copyToClipboard() {
    if (!article) return toast("Nothing to copy");
    try {
      await navigator.clipboard.writeText(article);
      toast("Copied to clipboard");
    } catch {
      toast("Copy failed");
    }
  }

  function generate() {
    if (!title.trim()) return toast("Enter a title or idea");
    setLoading(true);
    setArticle("");
    setProgress(0);
    setScore(null);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 12) + 6;
      if (p >= 98) p = 98;
      setProgress(p);
    }, 220);

    const wait = length === "short" ? 900 : length === "long" ? 4200 : 2400;
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);

      const kw = keywords ? `\n\n**Keywords:** ${keywords}` : "";
      const body = [
        `# ${title}`,
        "",
        "Quick intro — short summary and hook.",
        "",
        "## Why it matters",
        "A concise paragraph that explains the context and importance.",
        "",
        "## Key points",
        "- Point A\n- Point B\n- Point C",
        "",
        "## How to implement",
        "Step-by-step guidance and examples.",
        "",
        "## Conclusion",
        "Wrap up and CTA."
      ].join("\n\n");
      const multiplier = length === "short" ? 1 : length === "medium" ? 2 : 3;
      setArticle(Array.from({ length: multiplier }).map(() => body).join("\n\n") + kw);

      const base = 60 + Math.min(28, Math.floor(title.length / 2));
      const bonus = keywords ? 8 : 0;
      const rng = Math.floor(Math.random() * 10);
      setScore(Math.min(98, base + bonus + rng));

      setLoading(false);
    }, wait);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Generate Article</h1>
          <div style={{ color: "#6b7280", marginTop: 6 }}>Enter an idea, choose length, and click generate.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/" style={{ padding: "8px 12px", borderRadius: 10, background: "transparent", border: "1px solid rgba(15,23,36,0.06)", textDecoration: "none", color: "#0f1724" }}>Home</a>
          <a href="/docs" style={{ padding: "8px 12px", borderRadius: 10, background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", textDecoration: "none" }}>Docs</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        <div style={{ background: "white", padding: 18, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title or idea" style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(15,23,36,0.04)" }} />
            <select value={length} onChange={(e) => setLength(e.target.value)} style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(15,23,36,0.04)" }}>
              <option value="short">Short (300–500)</option>
              <option value="medium">Medium (600–900)</option>
              <option value="long">Long (1200–1800)</option>
            </select>
          </div>

          <div style={{ marginTop: 10 }}>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Comma-separated keywords (optional)" style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(15,23,36,0.04)" }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={generate} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", fontWeight: 700 }}>
              {loading ? "Generating…" : "Generate Article"}
            </button>
            <button onClick={copyToClipboard} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)", background: "transparent" }}>Copy</button>
            <button onClick={downloadMarkdown} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)", background: "transparent" }}>Download .md</button>
            <div style={{ marginLeft: "auto", color: "#6b7280", alignSelf: "center" }}>Words: <strong>{wordCount(article)}</strong></div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#6b7280", marginBottom: 8 }}>Progress: {progress}%</div>
            <div style={{ height: 8, background: "rgba(15,23,36,0.04)", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#ffd86f,#7be29a)", transition: "width 300ms linear" }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Generated article preview</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Edit, copy, or download the markdown.</div>
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{loading ? "Generating" : article ? "Ready" : "Idle"}</div>
            </div>

            <textarea ref={textRef} value={article} onChange={(e) => setArticle(e.target.value)} rows={16} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(15,23,36,0.04)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }} />
          </div>
        </div>

        <aside style={{ position: "sticky", top: 94 }}>
          <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>SEO Score</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>Realtime checks</div>
            </div>

            <div style={{ height: 10, background: "rgba(15,23,36,0.04)", borderRadius: 999, marginTop: 12 }}>
              <div style={{ height: "100%", width: `${score ?? 0}%`, background: "linear-gradient(90deg,#ffd86f,#7be29a)", transition: "width 300ms ease" }} />
            </div>

            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{score ?? "--"}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>{score ? (score >= 80 ? "Excellent" : score >= 65 ? "Good" : "Needs work") : "Generate to evaluate"}</div>

            <div style={{ borderTop: "1px solid rgba(15,23,36,0.04)", paddingTop: 10 }}>
              <div style={{ color: "#6b7280", fontSize: 13 }}>Quick checks</div>
              <ul style={{ marginTop: 8, color: "#6b7280", lineHeight: 1.7 }}>
                <li>• Title length: {title.length > 10 ? "OK" : "Short"}</li>
                <li>• Keywords present: {keywords ? "Yes" : "No"}</li>
                <li>• Word count: {wordCount(article) > 500 ? "Good" : "Low"}</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a href="mailto:support@synapsewrite.io" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", textDecoration: "none", color: "#0f1724", textAlign: "center" }}>Contact support</a>
              <a href="/docs" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", textDecoration: "none", color: "#0f1724", textAlign: "center" }}>Docs</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
