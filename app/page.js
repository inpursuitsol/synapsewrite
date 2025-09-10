"use client";
import React, { useState, useRef } from "react";

/**
 * app/page.js
 * - Auto-refreshes sources after generation if none returned by model
 * - Robust handleRefreshSources integrates { sources, confidence, evidenceSummary, warning }
 * - Human-friendly confidence display
 * - Reliable Copy Markdown with fallback
 * Drop-in: replace your existing app/page.js with this file.
 */

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [article, setArticle] = useState("");
  const [seo, setSeo] = useState(null); // will hold { title, meta, sources, confidence, evidenceSummary, warning, score }
  const [suggestions, setSuggestions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const controllerRef = useRef(null);

  // ---------- Helpers ----------
  function extractSeoBlock(streamText) {
    const jsonMatch = streamText.match(/\{[\s\S]*\}\s*$/);
    if (!jsonMatch) return { body: streamText.trim(), seoObj: null };
    const jsonText = jsonMatch[0];
    let seoObj = null;
    try {
      seoObj = JSON.parse(jsonText);
    } catch (e) {
      return { body: streamText.replace(jsonText, "").trim(), seoObj: null };
    }
    const body = streamText.replace(jsonText, "").trim();
    return { body, seoObj };
  }

  function generateFriendlySuggestions(seoObj, bodyText) {
    const s = [];
    const title = (seoObj && seoObj.title) || "";
    if (!title) s.push("Add a short, catchy title (50–60 characters).");
    else if (title.length > 80) s.push("Your title is long — aim for ~60 characters for better search display.");

    const meta = (seoObj && seoObj.meta) || "";
    if (!meta) s.push("Write a 1-sentence meta description (120–160 characters) summarizing the article.");
    else if (meta.length < 80) s.push("Meta seems short — expand to around 120–160 characters.");

    const words = (bodyText || "").split(/\s+/).filter(Boolean).length;
    if (words < 400) s.push("Article is short — aim for at least 600 words for better SEO.");
    else if (words < 700) s.push("Good length — consider adding one more example or a short checklist to improve depth.");

    const sources = (seoObj && seoObj.sources) || [];
    if (!sources || sources.length === 0) s.push("Add 2–3 sources or references to improve trust and search performance.");

    return s;
  }

  // Format confidence: accepts 0..1 or 0..100; returns string like "82%"
  function formatConfidence(conf) {
    if (conf === null || conf === undefined) return "—";
    const n = Number(conf);
    if (Number.isNaN(n)) return "—";
    let pct = n;
    if (pct <= 1.2) pct = Math.round(pct * 100);
    else pct = Math.round(pct);
    return `${pct}%`;
  }

  function confidenceExplanation(conf) {
    if (conf === null || conf === undefined) return "Confidence unavailable — refresh sources to compute evidence-backed confidence.";
    return `${formatConfidence(conf)} — a heuristic estimate of how well available sources support this draft.`;
  }

  // ---------- Refresh sources (calls backend route /api/stream/refresh) ----------
  async function handleRefreshSources() {
    const query = prompt && prompt.trim() ? prompt.trim() : (article && article.slice(0, 250)) || "";
    if (!query) {
      setStatusMessage("Nothing to search for — enter a prompt or generate an article first.");
      return;
    }

    setRefreshing(true);
    setStatusMessage("Refreshing sources...");
    try {
      const r = await fetch("/api/stream/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      if (!r.ok) {
        const txt = await r.text();
        setStatusMessage("Refresh failed: " + txt.slice(0, 300));
        setRefreshing(false);
        return;
      }

      const data = await r.json();
      // Merge returned fields into seo state
      const updatedSeo = {
        ...(seo || {}),
        sources: data.sources || [],
        confidence: data.confidence ?? (seo && seo.confidence) ?? null,
        evidenceSummary: data.evidenceSummary || null,
        warning: data.warning || null,
      };
      setSeo(updatedSeo);
      setSuggestions(generateFriendlySuggestions(updatedSeo, article));
      // Display short evidenceSummary or fallback message
      if (data.evidenceSummary) setStatusMessage(data.evidenceSummary);
      else if (data.warning) setStatusMessage(`Warning: ${data.warning}`);
      else setStatusMessage("Sources refreshed");
    } catch (e) {
      setStatusMessage("Failed to refresh sources: " + (e.message || "error"));
    } finally {
      setRefreshing(false);
    }
  }

  // ---------- Copy Markdown (robust) ----------
  async function copyArticleAsMarkdown() {
    if (!article) {
      setStatusMessage("Nothing to copy — generate an article first.");
      return;
    }
    const md = `# ${seo?.title || "Untitled"}\n\n${article}`;
    setStatusMessage("Copying article...");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(md);
        setStatusMessage("Copied article to clipboard (Markdown).");
        return;
      }
    } catch (e) {
      console.warn("Clipboard API failed:", e?.message || e);
    }

    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = md;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) setStatusMessage("Copied article to clipboard (Markdown).");
      else setStatusMessage("Copy failed — your browser blocked clipboard access.");
    } catch (e) {
      setStatusMessage("Copy failed: " + (e.message || "unknown error"));
    }
  }

  // ---------- Generate (stream) ----------
  async function handleGenerate(e) {
    e?.preventDefault();
    if (!prompt.trim()) {
      setStatusMessage("Please enter a topic or prompt to generate an article.");
      return;
    }
    setLoading(true);
    setStatusMessage("Generating — this may take a few seconds...");
    setArticle("");
    setSeo(null);
    setSuggestions([]);

    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 800 }),
        signal: controllerRef.current.signal,
      });

      if (!res.ok) {
        const txt = await res.text();
        setStatusMessage("Server error: " + res.status + ". " + txt.slice(0, 200));
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = "";

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          accumulated += decoder.decode(value, { stream: true });
          const { body } = extractSeoBlock(accumulated);
          setArticle(body);
        }
      }

      const { body, seoObj } = extractSeoBlock(accumulated + "\n");
      setArticle(body || "(No article body returned)");

      const normalizedSeo = seoObj
        ? {
            title: seoObj.title || "",
            meta: seoObj.meta || "",
            confidence:
              typeof seoObj.confidence === "number"
                ? seoObj.confidence
                : seoObj.confidence === undefined
                ? null
                : Number(seoObj.confidence),
            sources: seoObj.sources || [],
            score: seoObj.score || null,
          }
        : null;

      setSeo(normalizedSeo);
      setSuggestions(generateFriendlySuggestions(normalizedSeo, body));

      // Auto-refresh if no sources included by model
      if (!normalizedSeo || !Array.isArray(normalizedSeo.sources) || normalizedSeo.sources.length === 0) {
        setStatusMessage("Done — generated article. Fetching live sources...");
        try {
          await handleRefreshSources();
          setStatusMessage("Done — article generated and sources fetched. Review quick edits in the right panel.");
        } catch (e) {
          setStatusMessage("Article generated. Could not fetch live sources automatically — try clicking Refresh sources.");
        }
      } else {
        setStatusMessage("Done — article generated. Review the suggested quick edits in the right panel.");
      }
    } catch (err) {
      if (err.name === "AbortError") setStatusMessage("Generation cancelled.");
      else setStatusMessage("Generation failed: " + (err.message || "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // ---------- Publish readiness ----------
  function getPublishReadiness() {
    if (!seo) return { label: "Needs review", tone: "amber" };
    const score = seo.score || (seo.confidence ? Math.round(seo.confidence * 100) : null);
    if (score === null) return { label: "Review suggestions", tone: "amber" };
    if (score >= 75) return { label: "Ready to publish", tone: "green" };
    if (score >= 50) return { label: "Almost ready", tone: "amber" };
    return { label: "Needs edits", tone: "red" };
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">SynapseWrite — Instant blog drafts</h1>
          <p className="text-sm text-gray-600">Paste a topic and get a clean, publish-ready article. Suggestions are in plain English.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main className="lg:col-span-2">
            <form onSubmit={handleGenerate} className="mb-4">
              <div className="flex gap-3">
                <input
                  className="flex-1 rounded-md border px-3 py-2 shadow-sm"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Top phones in India 2025 — buyer guide"
                />
                <button
                  className={`px-4 py-2 rounded-md font-medium ${loading ? "bg-gray-400" : "bg-blue-600 text-white"}`}
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate"}
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border text-sm"
                  onClick={() => {
                    setPrompt("");
                    setArticle("");
                    setSeo(null);
                    setSuggestions([]);
                    setStatusMessage("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            <article className="prose max-w-none bg-white p-6 rounded-md shadow-sm min-h-[300px]">
              {article ? article.split(/\n\n+/).map((para, i) => <p key={i}>{para.trim()}</p>) : <p className="text-gray-500">Your generated article will appear here.</p>}
            </article>

            <div className="mt-4 text-sm text-gray-600">{statusMessage}</div>
          </main>

          <aside className="lg:col-span-1">
            <div className="bg-white p-5 rounded-md shadow-sm">
              <h3 className="text-lg font-medium">Publish readiness</h3>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold">{getPublishReadiness().label}</div>
                  <div className="text-sm text-gray-500">
                    Confidence: <strong>{formatConfidence(seo?.confidence)}</strong>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{confidenceExplanation(seo?.confidence)}</div>
                </div>
                <div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getPublishReadiness().tone === "green"
                        ? "bg-green-100 text-green-800"
                        : getPublishReadiness().tone === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {getPublishReadiness().label}
                  </div>
                </div>
              </div>

              <hr className="my-4" />

              <h4 className="font-medium">Quick fixes</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                {suggestions.length ? suggestions.map((s, i) => <li key={i}>{s}</li>) : <li>No quick fixes — looks good so far.</li>}
              </ul>

              <hr className="my-4" />

              {/* Sources block */}
              <h4 className="font-medium">Sources</h4>
              <div className="mt-2 text-sm text-gray-600">
                {seo && seo.sources && seo.sources.length ? (
                  <ol className="list-decimal list-inside">
                    {seo.sources.map((src, i) => (
                      <li key={i} className="truncate max-w-[14rem]">
                        <a className="text-blue-600 underline" href={src.url} target="_blank" rel="noreferrer">
                          {src.label || src.url}
                        </a>
                        {src.snippet ? <div className="text-xs text-gray-500 mt-1">{src.snippet}</div> : null}
                      </li>
                    ))}
                  </ol>
                ) : seo && seo.warning ? (
                  <div className="text-xs text-amber-700">Warning: {seo.warning}. Live search disabled on server.</div>
                ) : seo && seo.evidenceSummary ? (
                  <div className="text-xs text-gray-600">{seo.evidenceSummary}</div>
                ) : (
                  <div>No sources found. Click refresh to fetch sources.</div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className={`flex-1 px-3 py-2 rounded-md border ${refreshing || loading ? "opacity-60 cursor-wait" : "hover:bg-gray-50"}`}
                  onClick={handleRefreshSources}
                  disabled={refreshing || loading}
                >
                  {refreshing ? "Fetching..." : "Refresh sources"}
                </button>

                <button
                  className={`flex-1 px-3 py-2 rounded-md ${!article ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-blue-600 text-white"}`}
                  onClick={() => copyArticleAsMarkdown()}
                  disabled={!article}
                >
                  Copy Markdown
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-400">Suggestions are friendly hints — you always control the final text. For better SEO, use the copy button to export to your blog editor.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
