"use client";

import { useState, useRef } from "react";

/**
 * Frontend for RAG-enabled server:
 * - posts topic to /api/generate
 * - renders content, shows candidates + verification, and alerts if needsReview
 */

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [verification, setVerification] = useState({});
  const [verifiedCandidates, setVerifiedCandidates] = useState([]);
  const [needsReview, setNeedsReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  const wordCount = (t) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);
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
    setError("");
    setContent("");
    setCandidates([]);
    setVerification({});
    setVerifiedCandidates([]);
    setNeedsReview(false);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        let msg = "Something went wrong";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      const j = await res.json();
      setContent(j.content || "");
      setCandidates(Array.isArray(j.candidates) ? j.candidates : []);
      setVerification(j.verification || {});
      setVerifiedCandidates(Array.isArray(j.verifiedCandidates) ? j.verifiedCandidates : []);
      setNeedsReview(Boolean(j.needsReview));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);

      if (j.needsReview) {
        showToast("⚠️ Few verified sources found — article flagged for review");
      } else {
        showToast("✅ Article generated from verified sources");
      }
    } catch (err) {
      setError(err?.message ?? "Unknown error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function isTrustedLink(link = "") {
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
        .badge-good { background:#ECFDF5; color:#065F46; padding:6px 10px; border-radius:10px; }
        .badge-bad { background:#FEF3F2; color:#991B1B; padding:6px 10px; border-radius:10px; }
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
              placeholder='e.g., "Best iPhones available in India"'
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generateArticle(topic); }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => generateArticle(topic)} disabled={loading} className="btn btn-primary">
                {loading ? "Generating..." : "Generate"}
              </button>
              <button onClick={() => { setTopic(""); setContent(""); setCandidates([]); setVerification({}); setNeedsReview(false); setError(""); }} className="btn btn-ghost">Clear</button>
            </div>
          </div>
          {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>⚠️ {error}</div>}
        </section>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ color: "#6B7280" }}>{wordCount(content)} words • {minutes} min read</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { navigator.clipboard.writeText(content).then(()=>showToast("Copied ✅")); }} disabled={!content} className="btn btn-ghost">Copy</button>
            </div>
          </div>

          <div className="card" style={{ minHeight: 160 }} ref={resultRef}>
            {!content && !loading && <div style={{ color: "#6B7280" }}>Generated article will appear here. Use a topic like "Best iPhones available in India".</div>}
            {loading && <div style={{ color: "#6B7280" }}>Working… fetching live sources and composing the article.</div>}
            {content && <pre style={{ color: "#111827", lineHeight: 1.7 }}>{content}</pre>}
          </div>

          {/* verification panel */}
          <div style={{ marginTop: 12 }}>
            {needsReview ? (
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ Needs human review</div>
                <div style={{ color: "#6B7280" }}>
                  We could not verify enough candidates from trusted Indian sources. This article has been flagged for manual review to avoid incorrect recommendations.
                </div>
              </div>
            ) : null}

            {verifiedCandidates && verifiedCandidates.length > 0 && (
              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Verified candidates</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {verifiedCandidates.map((name, idx) => {
                    const v = verification[name];
                    return (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{name}</div>
                          <div style={{ color: "#6B7280", fontSize: 13 }}>{v?.short_reason}</div>
                        </div>
                        <div style={{ minWidth: 120, textAlign: "right" }}>
                          <div style={{ marginBottom: 6 }}>
                            <span className="badge-good">Verified</span>
                          </div>
                          <div style={{ textAlign: "right", fontSize: 13, color: "#6B7280" }}>
                            Sources: {v?.sources?.filter(s=>isTrustedLink(s.link)).length || 0}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* full verification detail (expandable) */}
            {candidates && candidates.length > 0 && (
              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>All candidates (verification detail)</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {candidates.map((c, i) => {
                    const v = verification[c.name] || { sources: [], trustedCount: 0 };
                    return (
                      <div key={i} style={{ borderBottom: "1px solid rgba(2,6,23,0.03)", paddingBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            <div style={{ color: "#6B7280" }}>{c.short_reason}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {v.trustedCount > 0 ? <span className="badge-good">Has official sources</span> : <span className="badge-bad">No official sources</span>}
                          </div>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          {v.sources && v.sources.length > 0 ? v.sources.slice(0,4).map((s, idx) => (
                            <div key={idx} style={{ marginBottom: 6 }}>
                              <a href={s.link} target="_blank" rel="noreferrer" style={{ color: "#2563EB" }}>{s.title || s.link}</a>
                              <div style={{ color: "#9CA3AF", fontSize: 13 }}>{s.snippet}</div>
                            </div>
                          )) : <div style={{ color: "#9CA3AF" }}>No search hits found for this candidate.</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

        <footer style={{ marginTop: 18, color: "#9CA3AF", fontSize: 13 }}>
          We verify using live Indian retailer & review pages. For launch, we recommend a manual review step for high-value articles.
        </footer>
      </div>
    </div>
  );
}

function wordCount(s) {
  return s ? s.trim().split(/\s+/).filter(Boolean).length : 0;
}
function isTrustedLink(link = "") {
  const signals = ["apple.com", "flipkart.com", "amazon.in", "gsmarena.com", "91mobiles.com"];
  const l = (link || "").toLowerCase();
  return signals.some((s) => l.includes(s));
}
