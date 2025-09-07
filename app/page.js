"use client";

import { useState, useRef } from "react";

/**
 * app/page.js - front-end for the RAG-enabled generate route
 * - Calls POST /api/generate with { topic }
 * - Renders content (Markdown/plain text) and shows list of sources and verification info
 */

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [sources, setSources] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  // small helpers
  const wordCount = (text) => (text ? text.trim().split(/\s+/).filter(Boolean).length : 0);
  const minutes = Math.max(1, Math.round(wordCount(content) / 200));

  function showToast(msg, ms = 1400) {
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      background: "rgba(15,23,42,0.95)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "10px",
      fontSize: "13px",
      zIndex: 9999,
      boxShadow: "0 8px 30px rgba(2,6,23,0.2)",
    });
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 300ms";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  async function generateArticle(topic) {
    if (!topic || !topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setError(null);
    setContent("");
    setSources([]);
    setVerification(null);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        let msg = "Something went wrong. Please try again.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      const j = await res.json();
      setContent(j.content || "");
      setSources(Array.isArray(j.sources) ? j.sources : []);
      setVerification(j.verification || null);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
      if (verification?.note) {
        showToast(verification.note || "Verification note present", 2000);
      }
    } catch (err) {
      const msg = err?.message ?? "Unknown error";
      setError(msg);
      console.error("Generate error:", err);
    } finally {
      setLoading(false);
    }
  }

  // small function to detect "official" sources (simple domain checks)
  function isOfficialSource(link = "") {
    const signals = ["apple.com", "flipkart.com", "amazon.in", "gsmarena.com", "91mobiles.com"];
    const l = (link || "").toLowerCase();
    return signals.some((s) => l.includes(s));
  }

  return (
    <div>
      <style>{`
        .container { max-width: 980px; margin: 28px auto; padding: 0 20px; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; }
        .card { background: #fff; border-radius: 12px; border: 1px solid rgba(2,6,23,0.03); padding: 18px; box-shadow: 0 8px 30px rgba(2,6,23,0.03); }
        .input { width:100%; padding:12px 14px; border-radius:10px; border:1.5px solid #E6EEF8; font-size:15px; outline:none; box-shadow: 0 2px 8px rgba(2,6,23,0.03); }
        .input:focus { border-color:#2563EB; box-shadow: 0 8px 28px rgba(37,99,235,0.12); }
        .btn { display:inline-flex; align-items:center; gap:8px; padding:9px 14px; border-radius:10px; border:none; font-weight:600; cursor:pointer; }
        .btn-primary { background: linear-gradient(180deg,#2563EB,#1E4ED8); color:#fff; box-shadow: 0 8px 30px rgba(37,99,235,0.14); }
        .btn-ghost { background:#fff; border: 1px solid #E6EEF8; color:#0F172A; }
        .verified { display:inline-block; padding:6px 10px; background:#ECFDF5; color:#065F46; border-radius:10px; font-weight:600; }
        .unverified { display:inline-block; padding:6px 10px; background:#FEF3F2; color:#991B1B; border-radius:10px; font-weight:600; }
        .sources-list a { color: #2563EB; text-decoration:none; }
        pre { white-space: pre-wrap; word-break: break-word; }
      `}</style>

      <div className="container">
        <section className="card">
          <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 8 }}>Article topic</label>

          <div style={{ display: "flex", gap: 12 }}>
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g., "Best iPhones available in India" (press Enter to generate)'
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generateArticle(topic);
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => generateArticle(topic)} disabled={loading} className="btn btn-primary">
                {loading ? "Generating..." : "Generate"}
              </button>
              <button onClick={() => { setTopic(""); setContent(""); setSources([]); setVerification(null); setError(null); }} className="btn btn-ghost">Clear</button>
            </div>
          </div>

          {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>⚠️ {error}</div>}
        </section>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ color: "#6B7280" }}>{wordCount(content)} words • {minutes} min read</div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => content && navigator.clipboard.writeText(content).then(()=>showToast("Copied ✅"))} disabled={!content} className="btn btn-ghost">Copy</button>
              <button onClick={() => content && (()=>{ const blob = new Blob([content], {type:"text/markdown"}); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = `${(topic||"article").replace(/\s+/g,"-")}.md`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); })()} disabled={!content} className="btn btn-ghost">Download</button>
            </div>
          </div>

          <div className="card" style={{ minHeight: 160 }}>
            {!content && !loading && <div style={{ color: "#6B7280" }}>Your generated article will appear here. Try: "Best iPhones available in India".</div>}
            {loading && <div style={{ color: "#6B7280" }}>Working… fetching live pages and composing the article (if SERPAPI enabled).</div>}
            {content && <pre style={{ color: "#111827", lineHeight: 1.7 }}>{content}</pre>}
          </div>

          {/* Sources / Verification */}
          <div style={{ marginTop: 12 }}>
            {verification && (
              <div style={{ marginBottom: 10 }}>
                {verification.verifiedBySearch ? <span className="verified">Verified sources found</span> : <span className="unverified">No official sources found</span>}
                <span style={{ color: "#6B7280", marginLeft: 12 }}>{verification.note || ""}</span>
              </div>
            )}

            {sources && sources.length > 0 && (
              <div className="card" style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Sources used (click to verify)</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {sources.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <a href={s.link} target="_blank" rel="noreferrer" className="sources-list">
                          {s.title || s.link}
                        </a>
                        <div style={{ color: "#9CA3AF", fontSize: 13 }}>{s.snippet}</div>
                      </div>
                      <div style={{ minWidth: 100, textAlign: "right" }}>
                        {isOfficialSource(s.link) ? <span className="verified">Official</span> : <span style={{ color: "#6B7280", fontSize: 13 }}>Other</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        <footer style={{ marginTop: 18, color: "#9CA3AF", fontSize: 13 }}>
          Generated content may require editing. We fetch live sources (India) when enabled; click source links to verify claims.
        </footer>
      </div>
    </div>
  );
}
