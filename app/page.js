"use client";
import React, { useState, useRef } from "react";

/**
 * Full app/page.js — polished UI with:
 * - Generation (streaming + fallback handled server-side)
 * - Editable SEO title + meta
 * - Refresh sources spinner + in-memory refresh route integration
 * - Read time calculation
 * - Copy Markdown with fallback
 * - Compact Pricing CTA (modal + checkout placeholder)
 *
 * Drop-in: replace your current app/page.js with this file.
 */

/* ----------------- Pricing CTA component ----------------- */
function PricingCTA({ onTrack } = {}) {
  const [open, setOpen] = React.useState(false);
  const [plan, setPlan] = React.useState("pro");

  function openModal(sel) {
    setPlan(sel || "pro");
    setOpen(true);
    try {
      if (typeof onTrack === "function") onTrack({ event: "pricing.open", plan: sel || "pro" });
    } catch (e) {}
    console.log("Pricing modal opened", sel || "pro");
  }

  function handleCheckout() {
    const checkoutUrl = `/checkout?plan=${plan}`;
    try {
      if (typeof onTrack === "function") onTrack({ event: "pricing.checkout", plan });
    } catch (e) {}
    window.location.href = checkoutUrl;
  }

  return (
    <>
      <div className="rounded-lg border p-3 bg-gradient-to-tr from-white to-gray-50 shadow-sm mt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">SynapseWrite Pro</div>
            <div className="text-xs text-gray-500">Faster drafts, unlimited exports</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">From</div>
            <div className="text-lg font-bold">
              ₹499 <span className="text-xs font-medium text-gray-500">/mo</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          <ul className="list-disc pl-4 space-y-1">
            <li>Unlimited Refresh Sources</li>
            <li>Priority generation & caching</li>
            <li>One-click export (WP)</li>
          </ul>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="flex-1 px-3 py-2 rounded-md bg-blue-600 text-white text-sm"
            onClick={() => openModal("pro")}
          >
            Upgrade to Pro
          </button>
          <button
            className="px-3 py-2 rounded-md border text-sm"
            onClick={() => openModal("starter")}
          >
            Plans
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Choose a plan</div>
                <div className="text-xs text-gray-500">Start with free or upgrade to Pro.</div>
              </div>
              <button className="text-gray-400" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="mt-4 space-y-3">
              <label className={`block p-3 rounded-md border ${plan === "starter" ? "border-blue-500 bg-blue-50" : "bg-white"}`}>
                <input type="radio" name="plan" checked={plan === "starter"} onChange={() => setPlan("starter")} />
                <span className="ml-2 inline-block align-middle">
                  <div className="text-sm font-medium">Starter (Free)</div>
                  <div className="text-xs text-gray-500">2 generations/day, limited refreshes</div>
                </span>
              </label>

              <label className={`block p-3 rounded-md border ${plan === "pro" ? "border-blue-500 bg-blue-50" : "bg-white"}`}>
                <input type="radio" name="plan" checked={plan === "pro"} onChange={() => setPlan("pro")} />
                <span className="ml-2 inline-block align-middle">
                  <div className="text-sm font-medium">Pro — ₹499 / month</div>
                  <div className="text-xs text-gray-500">Unlimited generations, priority refresh, WP export</div>
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="text-xs text-gray-500">Secure checkout • Cancel anytime</div>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-md border text-sm" onClick={() => setOpen(false)}>Cancel</button>
                <button className="px-3 py-2 rounded-md bg-green-600 text-white text-sm" onClick={handleCheckout}>
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ----------------- Main Page component ----------------- */
export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false); // generation running
  const [refreshing, setRefreshing] = useState(false); // refresh running (shows spinner)
  const [article, setArticle] = useState("");
  const [seo, setSeo] = useState(null); // { title, meta, sources, confidence, evidenceSummary, warning, score }
  const [editableTitle, setEditableTitle] = useState("");
  const [editableMeta, setEditableMeta] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const controllerRef = useRef(null);

  // Helper: strip the trailing SEO JSON block (if present) and return { body, seoObj }
  function extractSeoBlock(streamText) {
    const jsonMatch = (streamText || "").match(/\{[\s\S]*\}\s*$/);
    if (!jsonMatch) return { body: (streamText || "").trim(), seoObj: null };
    const jsonText = jsonMatch[0];
    try {
      const seoObj = JSON.parse(jsonText);
      const body = (streamText || "").replace(jsonText, "").trim();
      return { body, seoObj };
    } catch (e) {
      return { body: (streamText || "").trim(), seoObj: null };
    }
  }

  // Friendly suggestion generator
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

  // ====== Helper: human-friendly confidence formatting ======
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
    if (conf === null || conf === undefined) {
      return "Confidence unavailable — refresh sources to compute evidence-backed confidence.";
    }
    return `${formatConfidence(conf)} — a heuristic estimate of how well available sources support this draft.`;
  }

  function computeReadTime(bodyText) {
    if (!bodyText) return null;
    const words = (bodyText || "").split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, minutes };
  }

  // Refresh sources endpoint caller — updates seo and suggestions
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
      const updatedSeo = {
        ...(seo || {}),
        title: (seo && seo.title) || data.title || "",
        meta: (seo && seo.meta) || data.meta || "",
        sources: data.sources || [],
        confidence: data.confidence ?? (seo && seo.confidence) ?? null,
        evidenceSummary: data.evidenceSummary || null,
        warning: data.warning || null,
      };
      setSeo(updatedSeo);

      // if user has not made manual edits, populate the editable fields with returned SEO fields
      if (!editableTitle) setEditableTitle(updatedSeo.title || "");
      if (!editableMeta) setEditableMeta(updatedSeo.meta || "");

      setSuggestions(generateFriendlySuggestions(updatedSeo, article));
      if (data.evidenceSummary) setStatusMessage(data.evidenceSummary);
      else if (data.warning) setStatusMessage(`Warning: ${data.warning}`);
      else setStatusMessage("Sources refreshed");
    } catch (e) {
      setStatusMessage("Failed to refresh sources: " + (e.message || "error"));
    } finally {
      setRefreshing(false);
    }
  }

  // Robust copy-to-clipboard with fallback
  async function copyArticleAsMarkdown() {
    if (!article) {
      setStatusMessage("Nothing to copy — generate an article first.");
      return;
    }
    const md = `# ${seo?.title || editableTitle || "Untitled"}\n\n${article}`;
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

    // fallback: textarea + execCommand
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
      if (ok) {
        setStatusMessage("Copied article to clipboard (Markdown).");
      } else {
        setStatusMessage("Copy failed — your browser blocked clipboard access.");
      }
    } catch (e) {
      setStatusMessage("Copy failed: " + (e.message || "unknown error"));
    }
  }

  // Main generation flow (calls /api/stream which we made robust server-side)
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
    setEditableTitle("");
    setEditableMeta("");

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

      // Final parse for SEO block
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
            evidenceSummary: seoObj.evidenceSummary || null,
            warning: seoObj.warning || null,
          }
        : null;

      setSeo(normalizedSeo);
      setSuggestions(generateFriendlySuggestions(normalizedSeo, body));

      // populate editable fields from returned SEO if present
      if (normalizedSeo) {
        setEditableTitle(normalizedSeo.title || "");
        setEditableMeta(normalizedSeo.meta || "");
      }

      // If the model did not include sources, auto-trigger a live search to fetch them.
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

  function getPublishReadiness() {
    if (!seo) return { label: "Needs review", tone: "amber" };
    const score = seo.score || (seo.confidence ? Math.round(seo.confidence * 100) : null);
    if (score === null) return { label: "Review suggestions", tone: "amber" };
    if (score >= 75) return { label: "Ready to publish", tone: "green" };
    if (score >= 50) return { label: "Almost ready", tone: "amber" };
    return { label: "Needs edits", tone: "red" };
  }

  // Apply manual SEO edits into seo state
  function applySeoEdits() {
    const updated = {
      ...(seo || {}),
      title: editableTitle,
      meta: editableMeta,
    };
    setSeo(updated);
    setSuggestions(generateFriendlySuggestions(updated, article));
    setStatusMessage("SEO edits applied. Copy or publish when ready.");
  }

  const readInfo = computeReadTime(article);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">SynapseWrite — Instant blog drafts</h1>
          <p className="text-sm text-gray-600">Paste a topic and get a clean, publish-ready article. Edit SEO directly before exporting.</p>
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
                  aria-label="Prompt"
                />
                <button className={`px-4 py-2 rounded-md font-medium ${loading ? "bg-gray-400" : "bg-blue-600 text-white"}`} disabled={loading}>
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
                    setEditableTitle("");
                    setEditableMeta("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            <article className="prose max-w-none bg-white p-6 rounded-md shadow-sm min-h-[300px]">
              {article ? article.split(/\n\n+/).map((para, i) => <p key={i}>{para.trim()}</p>) : <p className="text-gray-500">Your generated article will appear here.</p>}
            </article>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">{statusMessage}</div>
              <div className="text-sm text-gray-500">
                {readInfo ? (
                  <span>Read time: <strong>{readInfo.minutes} min</strong> • Words: <strong>{readInfo.words}</strong></span>
                ) : (
                  <span>Read time: —</span>
                )}
              </div>
            </div>
          </main>

          <aside className="lg:col-span-1">
            <div className="bg-white p-5 rounded-md shadow-sm">
              <h3 className="text-lg font-medium">Publish readiness</h3>
              <div className="mt-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-2xl font-semibold">{getPublishReadiness().label}</div>
                  <div className="text-sm text-gray-500">
                    Confidence: <strong>{formatConfidence(seo?.confidence)}</strong>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{confidenceExplanation(seo?.confidence)}</div>
                </div>
                <div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPublishReadiness().tone === "green" ? "bg-green-100 text-green-800" : getPublishReadiness().tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                    {getPublishReadiness().label}
                  </div>
                </div>
              </div>

              <hr className="my-4" />

              <h4 className="font-medium">SEO (editable)</h4>
              <div className="mt-2">
                <label className="text-xs text-gray-600">Title</label>
                <input
                  className="w-full rounded-md border px-2 py-1 mt-1"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  placeholder="Enter SEO title (50–60 chars)"
                />
                <label className="text-xs text-gray-600 mt-2 block">Meta description</label>
                <textarea
                  className="w-full rounded-md border px-2 py-1 mt-1"
                  value={editableMeta}
                  onChange={(e) => setEditableMeta(e.target.value)}
                  placeholder="Enter meta description (120–160 chars)"
                  rows={3}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    className={`px-3 py-2 rounded-md ${editableTitle || editableMeta ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600 cursor-not-allowed"}`}
                    onClick={applySeoEdits}
                    disabled={!editableTitle && !editableMeta}
                  >
                    Apply SEO edits
                  </button>
                  <button
                    className="px-3 py-2 rounded-md border"
                    onClick={() => {
                      setEditableTitle(seo?.title || "");
                      setEditableMeta(seo?.meta || "");
                      setStatusMessage("Reverted edits to model-provided SEO (if any).");
                    }}
                  >
                    Revert
                  </button>
                </div>
              </div>

              <hr className="my-4" />

              <h4 className="font-medium">Quick fixes</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                {suggestions.length ? suggestions.map((s, i) => <li key={i}>{s}</li>) : <li>No quick fixes — looks good so far.</li>}
              </ul>

              <hr className="my-4" />

              <div className="flex items-center justify-between">
                <h4 className="font-medium">Sources</h4>
                <div className="text-xs text-gray-400">{seo?.sources?.length ?? 0} results</div>
              </div>

              <div className="mt-2 text-sm text-gray-600 min-h-[60px]">
                {refreshing ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gray-600" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeOpacity="0.2" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                    </svg>
                    <span>Fetching live sources…</span>
                  </div>
                ) : seo && seo.sources && seo.sources.length ? (
                  <ol className="list-decimal list-inside space-y-2">
                    {seo.sources.map((src, i) => (
                      <li key={i}>
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

              {/* pricing CTA inserted here */}
              <PricingCTA onTrack={(evt) => console.log("pricing event", evt)} />

              <div className="mt-4 text-xs text-gray-400">Suggestions are friendly hints — you always control the final text. For better SEO, apply edits and export.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
