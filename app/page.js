// app/page.js
"use client";

import { useState, useRef } from "react";

/**
 * Tailwind-based polished page for SynapseWrite.
 * - Streaming-capable: appends text chunks as they arrive
 * - Uses Tailwind classes for look & feel
 * - Includes inline SVG logo, copy/download/regenerate, word count + read-time
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
      // friendly toast fallback
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

    // Plausible analytics event (no-op if Plausible not present)
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

      // Fallback: JSON (non-stream)
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

      // Streaming path: read plain text chunks
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
          // update UI progressively
          setResult(accumulated);
        }
      }

      // final flush
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
    <main className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <header className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Small SVG logo */}
            <div className="flex-none">
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full bg-white shadow-sm">
                <rect width="48" height="48" rx="12" fill="#2563EB" />
                <path d="M14 28c0-6 6-10 10-10s10 4 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="18" r="1.8" fill="white" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">SynapseWrite</h1>
              <p className="text-sm text-slate-500 mt-1">Your AI writing co-pilot — generate polished blog articles in seconds.</p>
            </div>
          </div>

          <div className="text-right">
            <a href="https://synapsewrite.ai" target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:underline">synapsewrite.ai</a>
            <div className="mt-2 text-xs text-slate-400">Beta</div>
          </div>
        </header>

        {/* Input card */}
        <section className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-3">Article topic</label>

          <div className="flex gap-4">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g., "Top AI tools in 2025 — impact, use cases, examples"'
              className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => generateArticle(topic)}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white ${loading ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </button>

              <button
                onClick={() => { setTopic(""); setResult(""); setError(null); }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-md">
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Result & controls */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{words}</span> words • <span className="font-medium text-slate-800">{minutes}</span> min read
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => result && copyToClipboard(result)}
                disabled={!result}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm hover:shadow-sm disabled:opacity-50"
              >
                Copy
              </button>

              <button
                onClick={() => result && downloadArticle(topic || "article", result)}
                disabled={!result}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm hover:shadow-sm disabled:opacity-50"
              >
                Download
              </button>

              <button
                onClick={() => generateArticle(topic)}
                disabled={loading || !topic.trim()}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm hover:shadow-sm disabled:opacity-50"
              >
                Regenerate
              </button>
            </div>
          </div>

          <div ref={resultRef} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm max-h-[60vh] overflow-y-auto prose prose-sm sm:prose lg:prose-base">
            {!result && !loading && (
              <div className="text-slate-500">
                Your generated article will appear here. Try a topic like <span className="text-indigo-600">"Top AI tools in 2025"</span>.
              </div>
            )}

            {loading && (
              <div className="space-y-2 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-full" />
              </div>
            )}

            {result && !loading && (
              <article style={{ whiteSpace: "pre-wrap" }}>
                {result}
              </article>
            )}
          </div>
        </section>

        <footer className="mt-6 text-xs text-slate-400">
          Generated content may require editing. SynapseWrite does not store your data permanently unless you enable save.
        </footer>
      </div>
    </main>
  );
}
