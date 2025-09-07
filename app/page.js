"use client";

import { useState, useRef } from "react";

/**
 * Robust UI for SynapseWrite:
 * - Detects response content-type
 * - Handles JSON fallback, plain text fallback, and streaming plain-text chunks
 * - Keeps the polished UI and controls
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

    // Analytics (Plausible) — safe no-op if not present
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

      // If non-OK, try to parse JSON error or text error
      if (!res.ok) {
        let errText = "Something went wrong. Please try again.";
        const ct = res.headers.get("content-type") || "";
        try {
          if (ct.includes("application/json")) {
            const j = await res.json();
            if (j?.error) errText = j.error;
          } else {
            const t = await res.text();
            if (t) errText = t;
          }
        } catch (e) {
          // keep generic
        }
        throw new Error(errText);
      }

      const contentType = (res.headers.get("content-type") || "").toLowerCase();

      // CASE 1: server returned JSON (common fallback)
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!data?.content) {
          throw new Error("No content returned from server.");
        }
        setResult(data.content);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
        return;
      }

      // CASE 2: server returned final plain text (not streamed)
      if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
        const txt = await res.text();
        setResult(txt);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
        return;
      }

      // CASE 3: streaming plain text (preferred path)
      // If response has a body, treat as stream of text chunks
      if (!res.body) {
        // no body and not json/text -> fallback to text()
        const fallback = await res.text();
        setResult(fallback);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = "";

      // Read chunks and append progressively
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }
      }

      // final flush (in case)
      accumulated += decoder.decode();
      setResult(accumulated);
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
          <label className="small text-muted" style={{ display: "block", marginBottom: 8 }}>
            Article topic
          </label>
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
            <div style={{ marginTop: 12 }} className="card">
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
