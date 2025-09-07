"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Streaming-first UI with per-paragraph fade-in + typing cursor.
 * Paste this entire file into app/page.js
 */

export default function HomePage() {
  const [topic, setTopic] = useState("");
  // paragraphs: array of completed paragraphs (strings)
  const [paragraphs, setParagraphs] = useState([]);
  // current partial paragraph (string) being typed
  const [partial, setPartial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  // convenience derived string
  const fullText = [...paragraphs, partial].filter(Boolean).join("\n\n");

  // stats
  const getStats = (text) => {
    if (!text) return { words: 0, minutes: 0 };
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return { words, minutes };
  };
  const { words, minutes } = getStats(fullText);

  // small UI helpers
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Article copied to clipboard ✅");
    } catch {
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

  // Tiny non-intrusive toast
  function toast(msg, ms = 1600) {
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

  // Reset result
  function clearResult() {
    setParagraphs([]);
    setPartial("");
    setError(null);
  }

  // Main generate function — streaming aware and robust
  async function generateArticle(topic) {
    if (!topic || !topic.trim()) {
      setError("Please enter a topic to generate an article.");
      return;
    }

    if (typeof window !== "undefined" && window.plausible) {
      window.plausible("Generate Article");
    }

    setError(null);
    clearResult();
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      // non-OK handling
      if (!res.ok) {
        let errText = "Something went wrong. Please try again.";
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        try {
          if (ct.includes("application/json")) {
            const j = await res.json();
            if (j?.error) errText = j.error;
          } else {
            const t = await res.text();
            if (t) errText = t;
          }
        } catch {}
        throw new Error(errText);
      }

      const contentType = (res.headers.get("content-type") || "").toLowerCase();

      // JSON final response
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!data?.content) throw new Error("No content returned from server.");
        // Split into paragraphs for the fade-in effect
        const paras = splitIntoParagraphs(data.content);
        setParagraphs(paras);
        setPartial("");
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
        setLoading(false);
        return;
      }

      // Plain final text (no stream)
      if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
        const txt = await res.text();
        const paras = splitIntoParagraphs(txt);
        setParagraphs(paras);
        setPartial("");
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
        setLoading(false);
        return;
      }

      // Streaming path (preferred) — read chunks and build paragraphs progressively
      if (!res.body) {
        // fallback: treat as text
        const fallback = await res.text();
        const paras = splitIntoParagraphs(fallback);
        setParagraphs(paras);
        setPartial("");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = ""; // accumulate raw text stream

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          // Process buffer into paragraphs and partial
          const { completed, partial: newPartial } = extractParagraphs(buffer);
          // Update UI: append any newly completed paragraphs (keep existing)
          if (completed.length > 0) {
            // append while preserving previous paragraphs
            setParagraphs((prev) => {
              // avoid duplicating: merge prev + completed (simple append)
              return [...prev, ...completed];
            });
            // remove completed from buffer
            // compute remaining buffer (last partial)
            const lastPartialIndex = buffer.lastIndexOf("\n\n");
            buffer = lastPartialIndex >= 0 ? buffer.slice(lastPartialIndex + 2) : buffer;
          }
          setPartial(newPartial);
        }
      }

      // final flush
      buffer += decoder.decode();
      const { completed: finalCompleted, partial: finalPartial } = extractParagraphs(buffer);
      if (finalCompleted.length > 0) setParagraphs((prev) => [...prev, ...finalCompleted]);
      setPartial(finalPartial || "");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    } catch (err) {
      const msg = err?.message ?? "Unknown error. Try again.";
      setError(msg);
      console.error("Generate error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Helper: split plain text into paragraphs (trim, split on two or more newlines)
  function splitIntoParagraphs(text) {
    if (!text) return [];
    // Normalize CRLF to LF
    const normalized = text.replace(/\r\n/g, "\n").trim();
    // split on blank lines (two or more newlines)
    const parts = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return parts;
  }

  // Helper: from a running buffer, return completed paragraphs and current partial
  function extractParagraphs(buffer) {
    // Normalize
    const normalized = buffer.replace(/\r\n/g, "\n");
    // If there is a double newline, we consider everything before the last double newline as completed paragraphs
    const idx = normalized.lastIndexOf("\n\n");
    if (idx === -1) {
      // no completed paragraph yet — partial only
      return { completed: [], partial: normalized };
    }
    const completedText = normalized.slice(0, idx);
    const partial = normalized.slice(idx + 2);
    const completed = completedText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return { completed, partial };
  }

  // small effect: scroll down when paragraphs grow
  useEffect(() => {
    if (paragraphs.length > 0) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [paragraphs.length]);

  // keyboard: press Enter (with meta/ctrl) to generate quickly
  function handleKeyDown(e) {
    if ((e.key === "Enter" || e.keyCode === 13) && (e.metaKey || e.ctrlKey)) {
      generateArticle(topic);
    }
  }

  return (
    <div>
      {/* Inject small CSS for animations and cursor */}
      <style>{`
        .container-narrow { max-width: 920px; margin: 28px auto; padding: 0 20px; }
        .card { background: #fff; border-radius: 12px; border: 1px solid rgba(2,6,23,0.03); padding: 18px; box-shadow: 0 8px 30px rgba(2,6,23,0.03); }
        .input-bordered { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #E6EEF8; outline: none; font-size: 15px; transition: box-shadow 160ms, border-color 160ms; box-shadow: 0 2px 8px rgba(2,6,23,0.03); }
        .input-bordered:focus { border-color: #2563EB; box-shadow: 0 6px 24px rgba(37,99,235,0.12); }
        .btn { display:inline-flex; align-items:center; gap:8px; padding:9px 14px; border-radius:10px; border:none; font-weight:600; cursor:pointer; }
        .btn-primary { background: linear-gradient(180deg, #2563EB, #1E4ED8); color:#fff; box-shadow: 0 8px 30px rgba(37,99,235,0.14); }
        .btn-ghost { background:#fff; border: 1px solid #E6EEF8; color: #0F172A; }
        .result-card { background:#fff; border-radius:12px; border:1px solid rgba(2,6,23,0.03); padding:18px; box-shadow: 0 10px 36px rgba(2,6,23,0.03); max-height: 62vh; overflow-y:auto; }
        .para { opacity:0; transform: translateY(6px); transition: opacity 420ms ease, transform 420ms ease; margin-bottom:14px; line-height:1.72; color: #0f172a; }
        .para.visible { opacity:1; transform: translateY(0); }
        .partial { color: #0f172a; margin-bottom:6px; white-space:pre-wrap; }
        .cursor { display:inline-block; width:10px; height:18px; background: linear-gradient(180deg, #111827, #6b7280); margin-left:6px; border-radius:2px; vertical-align:middle; animation: blink 1s steps(1) infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        .meta { color:#6b7280; font-size:13px; }
      `}</style>

      <div className="container-narrow">
        {/* Input card */}
        <section className="card" style={{ marginTop: 6 }}>
          <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 8 }}>Article topic</label>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input
              className="input-bordered"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try: "Top AI tools in 2025 — use cases and examples" (Cmd/Ctrl+Enter to generate)'
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => generateArticle(topic)}
                disabled={loading}
                className="btn btn-primary"
                aria-disabled={loading}
              >
                {loading ? (
                  <>
                    <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="3"></circle>
                      <path d="M4 12a8 8 0 018-8v8z" fill="white"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </button>

              <button
                onClick={() => { setTopic(""); clearResult(); }}
                className="btn btn-ghost"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff6f6", border: "1px solid #fee2e2", color: "#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Meta & controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <div className="meta">
            <strong style={{ color: "#111827" }}>{words}</strong> words • <strong style={{ color: "#111827" }}>{minutes}</strong> min read
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fullText && copyToClipboard(fullText)} disabled={!fullText} className="btn btn-ghost">Copy</button>
            <button onClick={() => fullText && downloadArticle(topic || "article", fullText)} disabled={!fullText} className="btn btn-ghost">Download</button>
            <button onClick={() => generateArticle(topic)} disabled={loading || !topic.trim()} className="btn btn-ghost">Regenerate</button>
          </div>
        </div>

        {/* Result card */}
        <section ref={resultRef} className="result-card" style={{ marginTop: 12 }}>
          {/* Placeholder */}
          {!fullText && !loading && (
            <div style={{ color: "#6b7280" }}>
              Your generated article will appear here. Try a topic like <strong style={{ color: "#2563EB" }}>"Top AI tools in 2025"</strong>.
            </div>
          )}

          {/* Completed paragraphs (fade-in) */}
          <div>
            {paragraphs.map((p, i) => (
              <p key={i} className={"para visible"} dangerouslySetInnerHTML={{ __html: sanitizeParagraph(p) }} />
            ))}
          </div>

          {/* Partial paragraph with typing cursor */}
          {partial && (
            <div className="partial">
              <span dangerouslySetInnerHTML={{ __html: sanitizeParagraph(partial) }} />
              <span className="cursor" />
            </div>
          )}

          {/* Loading skeleton if nothing yet */}
          {loading && paragraphs.length === 0 && !partial && (
            <div style={{ opacity: 0.9 }}>
              <div style={{ height: 16, background: "#f3f4f6", borderRadius: 6, marginBottom: 8 }} />
              <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
            </div>
          )}
        </section>

        <footer style={{ marginTop: 18, color: "#9CA3AF", fontSize: 13 }}>
          Generated content may require editing. SynapseWrite does not store your data permanently unless you enable save.
        </footer>
      </div>
    </div>
  );
}

/* Utility: very small sanitizer for paragraph HTML rendering.
   We intentionally keep it minimal — strip script tags and convert newlines to <br>.
   (This prevents accidental script injection if model returns HTML.) */
function sanitizeParagraph(text = "") {
  // Replace < and > to avoid raw HTML injection, then convert simple markdown-like headings to <strong>
  const stripped = String(text)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert '## ' or '# ' at start to <strong> headings (very small enhancement)
  const withHeading = stripped.replace(/^######\s?(.*)/gm, "<strong>$1</strong>")
    .replace(/^#####\s?(.*)/gm, "<strong>$1</strong>")
    .replace(/^####\s?(.*)/gm, "<strong>$1</strong>")
    .replace(/^###\s?(.*)/gm, "<strong>$1</strong>")
    .replace(/^##\s?(.*)/gm, "<strong>$1</strong>")
    .replace(/^#\s?(.*)/gm, "<strong style='font-size:1.06em'>$1</strong>");

  // convert single newlines to <br> for paragraphs (we already split on double newlines)
  return withHeading.replace(/\n/g, "<br/>");
}
