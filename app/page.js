"use client";

import { useState, useRef } from "react";

/**
 * Frontend: robust rendering for structured JSON response from /api/generate
 * - Calls POST /api/generate with { topic }
 * - Expects JSON: { content: string, products: [{name,reason}], verification: { [name]: { verified, sources: [{title,link,snippet}] } } }
 * - Renders article, and a Verification / Sources card with clickable links
 */

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [products, setProducts] = useState([]);
  const [verification, setVerification] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  const getStats = (text) => {
    if (!text) return { words: 0, minutes: 0 };
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return { words, minutes };
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Article copied to clipboard ✅");
    } catch (e) {
      alert("Unable to copy — please select and copy manually.");
    }
  };

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

  const downloadArticle = (title = "article", contentText = "") => {
    const blob = new Blob([`# ${title}\n\n${contentText}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  async function generateArticle(topic) {
    if (!topic || !topic.trim()) {
      setError("Please enter a topic to generate an article.");
      return;
    }

    setError(null);
    setContent("");
    setProducts([]);
    setVerification({});
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        let errText = "Something went wrong. Please try again.";
        try {
          const j = await res.json();
          if (j?.error) errText = j.error;
        } catch (e) {
          const t = await res.text().catch(() => "");
          if (t) errText = t;
        }
        throw new Error(errText);
      }

      // Server always returns JSON (content + optional verification)
      const j = await res.json();
      const returnedContent = j?.content ?? "";
      const returnedProducts = Array.isArray(j?.products) ? j.products : [];
      const returnedVerification = j?.verification ?? {};

      setContent(returnedContent);
      setProducts(returnedProducts);
      setVerification(returnedVerification);

      // scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
    } catch (err) {
      const msg = err?.message ?? "Unknown error. Try again.";
      setError(msg);
      console.error("Generate error:", err);
    } finally {
      setLoading(false);
    }
  }

  const { words, minutes } = getStats(content);

  // Helper: extract "Sources:" block from content text (case-insensitive)
  function extractSourcesBlock(text) {
    if (!text) return "";
    const lower = text.toLowerCase();
    const idx = lower.lastIndexOf("sources:");
    if (idx === -1) return "";
    return text.slice(idx + "sources:".length).trim();
  }

  return (
    <div>
      <style>{`
        .container { max-width: 920px; margin: 28px auto; padding: 0 20px; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; }
        .card { background: #fff; border-radius: 12px; border: 1px solid rgba(2,6,23,0.03); padding: 18px; box-shadow: 0 8px 30px rgba(2,6,23,0.03); }
        .input { width:100%; padding:12px 14px; border-radius:10px; border:1.5px solid #E6EEF8; font-size:15px; outline:none; box-shadow: 0 2px 8px rgba(2,6,23,0.03); }
        .input:focus { border-color:#2563EB; box-shadow: 0 8px 28px rgba(37,99,235,0.12); }
        .btn { display:inline-flex; align-items:center; gap:8px; padding:9px 14px; border-radius:10px; border:none; font-weight:600; cursor:pointer; }
        .btn-primary { background: linear-gradient(180deg,#2563EB,#1E4ED8); color:#fff; box-shadow: 0 8px 30px rgba(37,99,235,0.14); }
        .btn-ghost { background:#fff; border: 1px solid #E6EEF8; color:#0F172A; }
        .result { margin-top: 16px; }
        .verification { background:#fff; border-radius:10px; border:1px solid rgba(2,6,23,0.03); padding:14px; margin-top:12px; }
        .verified-badge { display:inline-block; padding:6px 8px; background: #ECFDF5; color: #065F46; border-radius:8px; font-size:13px; }
        .unverified-badge { display:inline-block; padding:6px 8px; background: #FEF3F2; color: #991B1B; border-radius:8px; font-size:13px; }
        .sources-list a { color: #2563EB; text-decoration: none; }
      `}</style>

      <div className="container">
        <section className="card">
          <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 8 }}>Article topic</label>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
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
              <button onClick={() => { setTopic(""); setContent(""); setProducts([]); setVerification({}); setError(null); }} className="btn btn-ghost">Clear</button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff6f6", border: "1px solid #fee2e2", color: "#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}
        </section>

        <div className="result" ref={resultRef}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ color: "#6B7280", fontSize: 13 }}>
              <strong style={{ color: "#111827" }}>{words}</strong> words • <strong style={{ color: "#111827" }}>{minutes}</strong> min read
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => content && copyToClipboard(content)} disabled={!content} className="btn btn-ghost">Copy</button>
              <button onClick={() => content && downloadArticle(topic || "article", content)} disabled={!content} className="btn btn-ghost">Download</button>
            </div>
          </div>

          <div className="card" style={{ minHeight: 160 }}>
            {!content && !loading && <div style={{ color: "#6B7280" }}>Your generated article will appear here. Try: "Best iPhones available in India".</div>}

            {loading && <div style={{ color: "#9CA3AF" }}>Working... this may take a few seconds while we verify facts (if verification is enabled).</div>}

            {content && (
              <article style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#111827" }}>
                {content}
              </article>
            )}
          </div>

          {/* Verification & Sources */}
          <div style={{ marginTop: 12 }}>
            {/* If server returned structured products */}
            {products && products.length > 0 && (
              <div className="verification">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>Products mentioned</div>
                  <div style={{ fontSize: 13, color: "#6B7280" }}>Verification results</div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {products.map((p, i) => {
                    const v = verification?.[p.name] || { verified: false, sources: [] };
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.name}</div>
                          <div style={{ color: "#6B7280", fontSize: 13 }}>{p.reason}</div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {v.verified ? <span className="verified-badge">Verified</span> : <span className="unverified-badge">Unverified</span>}
                          <div style={{ marginTop: 8, textAlign: "right" }}>
                            <div className="sources-list" style={{ textAlign: "right" }}>
                              {v.sources && v.sources.length > 0 ? v.sources.slice(0, 4).map((s, idx) => (
                                <div key={idx} style={{ marginBottom: 6 }}>
                                  <a href={s.link} target="_blank" rel="noreferrer">{s.title || s.link}</a>
                                  <div style={{ color: "#9CA3AF", fontSize: 12 }}>{s.snippet}</div>
                                </div>
                              )) : <div style={{ color: "#9CA3AF", fontSize: 13 }}>No sources found</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If the model included a plain Sources block within content, show it too */}
            {content && extractSourcesBlock(content) && (
              <div className="verification" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Sources (from model)</div>
                <div style={{ color: "#6B7280", whiteSpace: "pre-wrap" }}>{extractSourcesBlock(content)}</div>
              </div>
            )}
          </div>
        </div>

        <footer style={{ marginTop: 18, color: "#9CA3AF", fontSize: 13 }}>
          Generated content may require editing. Verification uses web search results (if enabled). Always click source links to confirm.
        </footer>
      </div>
    </div>
  );
}
