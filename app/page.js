"use client";

import { useState, useRef } from "react";

/**
 * Polished UI for SynapseWrite (updated to match new header + font)
 */

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
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
      alert("Article copied to clipboard ✅");
    } catch (e) {
      alert("Unable to copy — please select and copy manually.");
    }
  };

  const downloadArticle = (title = "article", content = "") => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
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

    if (typeof window !== "undefined" && window.plausible) {
      window.plausible("Generate Article");
    }

    setError(null);
    setResult("");
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
        } catch (e) {}
        throw new Error(errText);
      }

      const data = await res.json();
      if (!data?.content) {
        throw new Error("No content returned from the server. Try again.");
      }

      setResult(data.content);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
    } catch (err) {
      const msg = err?.message ?? "Unknown error. Try again.";
      setError(msg);
      console.error("Generate error:", err);
    } finally {
      setLoading(false);
    }
  }

  const { words, minutes } = getStats(result);

  return (
    <div>
      <div className="container-narrow">
        {/* Input card */}
        <section className="card" style={{ marginTop: 28 }}>
          <label className="small text-muted" style={{ display: "block", marginBottom: 8 }}>Article topic</label>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g., "Top AI tools in 2025 — impact, use cases, examples"'
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => generateArticle(topic)} disabled={loading} className="btn btn-primary">
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <svg style={{ width: 18, height: 18 }} className="spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="4"></circle>
                      <path d="M4 12a8 8 0 018-8v8z" fill="white"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  "Generate"
                )}
              </button>

              <button
                onClick={() => {
                  setTopic("");
                  setResult("");
                  setError(null);
                }}
                className="btn btn-ghost"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12 }} className="card" >
              <div style={{ color: "#B91C1C" }}>⚠️ {error}</div>
            </div>
          )}
        </section>

        {/* Result + actions */}
        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="small text-muted">
              <strong style={{ color: "var(--text-dark)" }}>{words}</strong> words • <strong style={{ color: "var(--text-dark)" }}>{minutes}</strong> min read
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => result && copyToClipboard(result)} disabled={!result} className="btn btn-ghost" style={{ padding: "8px 12px" }}>
                Copy
              </button>

              <button onClick={() => result && downloadArticle(topic || "article", result)} disabled={!result} className="btn btn-ghost" style={{ padding: "8px 12px" }}>
                Download
              </button>

              <button onClick={() => generateArticle(topic)} disabled={loading || !topic.trim()} className="btn btn-ghost" style={{ padding: "8px 12px" }}>
                Regenerate
              </button>
            </div>
          </div>

          <div ref={resultRef} className="result-card pre-wrap" style={{ minHeight: 160 }}>
            {!result && !loading && (
              <div className="text-muted">Your generated article will appear here. Try a topic like <span style={{ color: "var(--brand-primary)" }}>"Top AI tools in 2025"</span>.</div>
            )}

            {loading && (
              <div style={{ opacity: 0.9 }}>
                <div style={{ height: 16, background: "#f3f4f6", borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, width: "85%" }} />
              </div>
            )}

            {result && !loading && <article style={{ lineHeight: 1.7 }}>{result}</article>}
          </div>
        </section>

        <footer style={{ marginTop: 18, color: "#9CA3AF", fontSize: 13 }}>
          Generated content may require editing. SynapseWrite does not store your data permanently unless you enable save.
        </footer>
      </div>
    </div>
  );
}
