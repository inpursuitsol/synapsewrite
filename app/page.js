"use client";

import { useState, useRef } from "react";

/**
 * Polished UI for SynapseWrite:
 * - Tailwind-powered layout
 * - Smooth loading animation
 * - Tagline, copy & download actions
 * - Scrollable result box with word count + read time
 * - Friendly errors
 */

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  // Utility: compute words & estimated read time
  const getStats = (text) => {
    if (!text) return { words: 0, minutes: 0 };
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200)); // ~200 WPM
    return { words, minutes };
  };

  // Copy text to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Article copied to clipboard ✅");
    } catch (e) {
      alert("Unable to copy — please select and copy manually.");
    }
  };

  // Download as markdown file
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

  // Main API call
  async function generateArticle(topic) {
    if (!topic || !topic.trim()) {
      setError("Please enter a topic to generate an article.");
      return;
    }

    // Analytics (Plausible) — will no-op if not present
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
      // scroll result into view smoothly
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
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold leading-tight">📝 SynapseWrite</h1>
              <p className="text-sm text-gray-600 mt-1">
                Your AI writing co-pilot — generate polished blog articles in seconds.
              </p>
            </div>
            <div className="text-right">
              <a
                href="https://synapsewrite.ai"
                className="text-xs text-gray-500 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                synapsewrite.ai
              </a>
              <div className="mt-2 text-right text-xs text-gray-400">Beta</div>
            </div>
          </div>
        </header>

        {/* Input Card */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Article topic</label>
          <div className="flex gap-3 items-start">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Top AI tools in 2025 — impact, use cases, and examples"
              className="flex-1 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => generateArticle(topic)}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm text-white ${
                  loading ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
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
                onClick={() => {
                  setTopic("");
                  setResult("");
                  setError(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Result / Controls */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{words}</span> words • <span className="font-medium">{minutes}</span> min read
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => result && copyToClipboard(result)}
                disabled={!result}
                className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm hover:shadow-sm disabled:opacity-50"
              >
                Copy
              </button>

              <button
                onClick={() => result && downloadArticle(topic || "article", result)}
                disabled={!result}
                className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm hover:shadow-sm disabled:opacity-50"
              >
                Download
              </button>

              <button
                onClick={() => generateArticle(topic)}
                disabled={loading || !topic.trim()}
                className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm hover:shadow-sm disabled:opacity-50"
              >
                Regenerate
              </button>
            </div>
          </div>

          <div
            ref={resultRef}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-h-[60vh] overflow-y-auto prose prose-sm sm:prose lg:prose-base"
          >
            {/* If no result yet, show a friendly placeholder */}
            {!result && !loading && (
              <div className="text-gray-500">
                Your generated article will appear here. Try a topic like{" "}
                <span className="text-indigo-600">"Top AI tools in 2025"</span>.
              </div>
            )}

            {/* Loading small skeleton */}
            {loading && (
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-4/5" />
              </div>
            )}

            {/* Render result */}
            {result && !loading && (
              <article>
                {/* If the model returns markdown/listing, we render as plain text preserving newlines */}
                <div style={{ whiteSpace: "pre-wrap" }}>{result}</div>
              </article>
            )}
          </div>
        </section>

        {/* Footer / microcopy */}
        <footer className="mt-6 text-xs text-gray-400">
          Generated content may require editing. SynapseWrite does not store your data permanently unless you enable save.
        </footer>
      </div>
    </main>
  );
}
