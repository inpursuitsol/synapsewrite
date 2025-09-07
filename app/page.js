"use client";

import { useState, useRef, useEffect } from "react";

/**
 * app/page.js - Generalized UI for the new route.js
 * - Region selector (auto-detect)
 * - Force verify toggle
 * - SEO preview (title/meta)
 * - Article rendering and sources with trust badges
 */

const REGIONS = [
  { code: "auto", label: "Auto (detect)" },
  { code: "in", label: "India (IN)" },
  { code: "us", label: "United States (US)" },
  { code: "uk", label: "United Kingdom (UK)" },
  { code: "ca", label: "Canada (CA)" },
  { code: "au", label: "Australia (AU)" },
  { code: "de", label: "Germany (DE)" },
  { code: "fr", label: "France (FR)" },
  { code: "sg", label: "Singapore (SG)" },
];

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [region, setRegion] = useState("auto");
  const [forceVerify, setForceVerify] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  // Auto-detect region from browser language when region === "auto"
  useEffect(() => {
    if (region !== "auto") return;
    const lang = (navigator.language || navigator.userLanguage || "en-US").toLowerCase();
    const parts = lang.split("-");
    if (parts.length > 1) setRegion(parts[1]);
  }, []);

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

  async function generate() {
    if (!topic || !topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    // choose region to send: if 'auto' then send nothing so server uses Accept-Language
    const payload = {
      topic,
      region: region === "auto" ? undefined : region,
      forceVerify,
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let txt = "Something went wrong";
        try {
          const j = await res.json();
          txt = j?.error || txt;
        } catch {}
        throw new Error(txt);
      }

      const j = await res.json();
      setResult(j);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);

      if (j.needsReview) {
        showToast("⚠️ This article needs human review before publishing", 2200);
      } else {
        showToast("✅ Article generated (check sources below)", 1400);
      }
    } catch (err) {
      setError(err?.message ?? "Unknown error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function isOfficial(link = "") {
    if (!link) return false;
    const trusted = ["apple.com", "flipkart.com", "amazon.", "gsmarena.com", "91mobiles.com", "bestbuy.com", "theverge.com", "techradar.com"];
    return trusted.some((d) => link.toLowerCase().includes(d));
  }

  function exportMarkdown() {
    if (!result) return;
    const blob = new Blob([result.content || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(result.title || "article").replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <style>{`
        .container { max-width: 980px; margin: 28px auto; padding: 0 20px; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; }
        .card { background:#fff; border-radius:12px; padding:16px; border:1px solid rgba(2,6,23,0.04); box-shadow: 0 8px 30px rgba(2,6,23,0.03); }
        .input { width:100%; padding:12px 14px; border-radius:10px; border:1.5px solid #E6EEF8; outline:none; box-shadow:0 2px 8px rgba(2,6,23,0.03); }
        .input:focus { border-color:#2563EB; box-shadow:0 8px 28px rgba(37,99,235,0.12); }
        .btn { display:inline-flex; align-items:center; gap:8px; padding:9px 14px; border-radius:10px; font-weight:600; cursor:pointer; border:none; }
        .btn-primary { background:linear-gradient(180deg,#2563EB,#1E4ED8); color:#fff; }
        .btn-ghost { background:#fff; border:1px solid #E6EEF8; color:#0F172A; }
        .badge { display:inline-block; padding:6px 10px; border-radius:8px; font-weight:600; }
        .trusted { background:#ECFDF5; color:#065F46; }
        .untrusted { background:#FEF3F2; color:#991B1B; }
        pre { white-space:pre-wrap; word-break:break-word; }
      `}</style>

      <div className="container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h1 style={{ margin: 0 }}>SynapseWrite</h1>
          <div style={{ color: "#6B7280" }}>{region === "auto" ? "Region: Auto" : `Region: ${region.toUpperCase()}`}</div>
        </header>

        <section className="card">
          <div style={{ display: "flex", gap: 12 }}>
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='Enter a topic (e.g., "Best phones in Canada 2025")'
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 120 }}>
              <button onClick={generate} disabled={loading} className="btn btn-primary">
                {loading ? "Generating…" : "Generate"}
              </button>
              <button onClick={() => { setTopic(""); setResult(null); setError(""); }} className="btn btn-ghost">Clear</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
            <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
              {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={forceVerify} onChange={(e) => setForceVerify(e.target.checked)} />
              <span style={{ color: "#6B7280" }}>Force live verification</span>
            </label>

            <div style={{ marginLeft: "auto", color: "#6B7280" }}>
              <small>Retrieval: {result?.retrieved ? "enabled" : "on demand"}</small>
            </div>
          </div>

          {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>⚠️ {error}</div>}
        </section>

        <div style={{ marginTop: 16 }} ref={resultRef}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <div style={{ color: "#6B7280" }}>{result ? `${(result.content || "").split(/\s+/).length} words` : "—"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={!result} onClick={() => navigator.clipboard.writeText(result?.content || "").then(()=>showToast("Copied ✅"))} className="btn btn-ghost">Copy</button>
              <button disabled={!result} onClick={exportMarkdown} className="btn btn-ghost">Download</button>
            </div>
          </div>

          <div className="card" style={{ minHeight: 200 }}>
            {!result && !loading && <div style={{ color: "#6B7280" }}>Your SEO-optimized article will appear here. Use the region selector to localize retrieval.</div>}
            {loading && <div style={{ color: "#6B7280" }}>Working… fetching sources and composing a verified SEO article.</div>}
            {result && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{result.title}</div>
                  <div style={{ color: "#6B7280", marginTop: 6 }}>{result.meta}</div>
                </div>

                {result.needsReview && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: "#fff7ed", border: "1px solid #ffedd5" }}>
                    <strong>⚠️ Needs review</strong> — insufficient trusted sources for the selected region or topic sensitivity. Do not publish without manual verification.
                  </div>
                )}

                <article style={{ color: "#111827", lineHeight: 1.7 }}>
                  <pre>{result.content}</pre>
                </article>
              </>
            )}
          </div>

          {/* Sources and verification */}
          {result && (
            <div style={{ marginTop: 12 }}>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>Sources</div>
                  <div style={{ color: "#6B7280" }}>{result.verification?.note}</div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {result.sources && result.sources.length > 0 ? result.sources.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <a href={s.link} target="_blank" rel="noreferrer" style={{ color: "#2563EB", fontWeight: 600 }}>{s.title || s.link}</a>
                        <div style={{ color: "#6B7280", fontSize: 13 }}>{s.snippet}</div>
                      </div>
                      <div style={{ minWidth: 110, textAlign: "right" }}>
                        {isOfficial(s.link) ? <span className="badge trusted">Trusted</span> : <span className="badge untrusted">Other</span>}
                        <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 8 }}>{new URL(s.link).hostname}</div>
                      </div>
                    </div>
                  )) : <div style={{ color: "#6B7280" }}>No sources were found for this topic/region.</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        <footer style={{ marginTop: 18, color: "#9CA3AF", fontSize: 13 }}>
          SynapseWrite: SEO-first articles, localized sourcing, and verification. For launch, enable live verification (SERPAPI_KEY) and consider a quick human review workflow for high-value content.
        </footer>
      </div>
    </div>
  );
}
