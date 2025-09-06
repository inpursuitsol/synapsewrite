// app/page.js
"use client";

import { useState, useRef } from "react";

/**
 * Polished streaming UI for SynapseWrite.
 * - Appends server-streamed chunks live
 * - Falls back to JSON response if server returns application/json
 * - Includes branding, tagline, copy/download, read-time, nice visuals
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

      const contentType = res.headers.get("content-type") || "";

      // Case A: server returned a JSON (non-stream fallback)
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) {
          const err = data?.error ?? "Something went wrong. Try again.";
          throw new Error(err);
        }
        if (!data?.content) throw new Error("No content returned from server.");
        setResult(data.content);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
        return;
      }

      // Case B: server is streaming plain text chunks (our preferred path)
      if (!res.body) {
        throw new Error("No response body from server.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }
      }

      // final decode (just in case)
      setResult((prev) => prev + decoder.decode());
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
    <main style={{ minHeight: "100vh", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      <div style={{ maxWidth: 920, margin: "30px auto", padding: "20px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>📝 SynapseWrite</h1>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>Your AI writing co-pilot — craft polished articles in seconds.</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <a href="https://synapsewrite.ai" target="_blank" rel="noreferrer" style={{ color: "#6b7280", fontSize: 13 }}>synapsewrite.ai</a>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>Beta</div>
          </div>
        </header>

        {/* Input card */}
        <section style={{ background: "#fff", border: "1px solid #e6e6e6", borderRadius: 14, padding: 20, boxShadow: "0 4px 20px rgba(15,23,42,0.03)" }}>
          <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 8 }}>Article topic</label>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g., "Top AI tools in 2025 — impact, use cases, examples"'
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                outline: "none",
                fontSize: 15,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => generateArticle(topic)}
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  background: loading ? "#93c5fd" : "#2563eb",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ width: 18, height: 18 }} className="spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="4"></circle>
                      <path d="M4 12a8 8 0 018-8v8z" fill="white"></path>
                    </svg>
                    Generating...
                  </>
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
                style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer" }}
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, color: "#b91c1c", background: "#fff1f2", border: "1px solid #fee2e2", padding: 12, borderRadius: 8 }}>
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Result header + actions */}
        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              <strong style={{ color: "#111827" }}>{words}</strong> words • <strong style={{ color: "#111827" }}>{minutes}</strong> min read
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => result && copyToClipboard(result)} disabled={!result} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "#fff", cursor: result ? "pointer" : "not-allowed" }}>
                Copy
              </button>
              <button onClick={() => result && downloadArticle(topic || "article", result)} disabled={!result} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "#fff", cursor: result ? "pointer" : "not-allowed" }}>
                Download
              </button>
              <button onClick={() => generateArticle(topic)} disabled={loading || !topic.trim()} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "#fff", cursor: loading || !topic.trim() ? "not-allowed" : "pointer" }}>
                Regenerate
              </button>
            </div>
          </div>

          <div ref={resultRef} style={{ background: "#fff", border: "1px solid #e6e6e6", borderRadius: 12, padding: 20, maxHeight: "62vh", overflowY: "auto", boxShadow: "0 6px 24px rgba(15,23,42,0.03)" }}>
            {!result && !loading && (
              <div style={{ color: "#6b7280" }}>
                Your generated article will appear here. Try a topic like <span style={{ color: "#2563eb" }}>"Top AI tools in 2025"</span>.
              </div>
            )}

            {loading && (
              <div style={{ opacity: 0.9 }}>
                <div style={{ height: 16, background: "#f3f4f6", borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, width: "85%" }} />
              </div>
            )}

            {result && !loading && (
              <article style={{ whiteSpace: "pre-wrap", color: "#111827", lineHeight: 1.6 }}>
                {result}
              </article>
            )}
          </div>
        </section>

        <footer style={{ marginTop: 18, color: "#9ca3af", fontSize: 13 }}>
          Generated content may require editing. SynapseWrite does not store your data permanently unless you enable save.
        </footer>
      </div>
    </main>
  );
}
