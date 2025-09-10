// app/api/stream/refresh/route.js
import { NextResponse } from "next/server";

/**
 * Refresh sources endpoint
 * - POST { prompt: "Top phones in India 2025" }
 * - Requires process.env.SERPAPI_KEY (SerpAPI)
 *
 * Returns:
 *  { sources: [{url,label,snippet}], confidence: number (0..1), evidenceSummary: string }
 *
 * Notes:
 * - Keep quotas in mind; SerpAPI is a paid service for a lot of queries.
 * - You can replace SerpAPI with another search provider by editing the fetch logic below.
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY || null;
const SERPAPI_URL = "https://serpapi.com/search.json";

async function fetchSerpApi(query, options = {}) {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    hl: options.hl || "en",
    gl: options.gl || "in", // geo: India by default
    num: String(options.num || 6),
    api_key: SERPAPI_KEY,
  });
  const url = `${SERPAPI_URL}?${params.toString()}`;

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SerpAPI error ${resp.status}: ${txt}`);
  }
  return resp.json();
}

function scoreFromResults(results) {
  // Simple heuristic: more organic results → higher confidence.
  // results: array of organic results (may be empty)
  if (!results || results.length === 0) return 0.15;
  const n = Math.min(results.length, 5);
  // base 0.4 + 0.12 per result (capped)
  return Math.min(0.95, 0.35 + 0.12 * n);
}

function summarizeTopResults(results) {
  if (!results || results.length === 0) return "No relevant results found.";
  // take top 3 titles/snippets and create a short summary sentence
  const top = results.slice(0, 3);
  const parts = top.map((r) => {
    const t = r.title?.replace(/\s+/g, " ").trim() || r.link || "";
    const s = (r.snippet || r.snippet_highlighted || "").replace(/\s+/g, " ").trim();
    return s ? `${t}: ${s}` : t;
  }).filter(Boolean);
  return parts.join(" — ");
}

export async function POST(req) {
  try {
    const payload = await req.json().catch(() => ({}));
    const prompt = (payload.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    if (!SERPAPI_KEY) {
      // graceful fallback: acknowledge missing key so frontend can show a message
      return NextResponse.json({
        sources: [],
        confidence: 0,
        evidenceSummary: "SERPAPI_KEY not configured on the server. Live searches are disabled.",
        warning: "SERPAPI_KEY_MISSING",
      });
    }

    // Build query for searching evidence. We add context to bias results to 2025 + India availability.
    // Example: "Top phones in India 2025 available in India site:amazon.in OR site:flipkart.com"
    const searchQuery = `${prompt} 2025 availability India`;

    // fetch SerpAPI
    let json;
    try {
      json = await fetchSerpApi(searchQuery, { hl: "en", gl: "in", num: 6 });
    } catch (err) {
      console.error("SerpAPI fetch error:", err.message || err);
      return NextResponse.json({
        sources: [],
        confidence: 0,
        evidenceSummary: `Search failed: ${err.message || "unknown error"}`,
        error: err.message || String(err),
      }, { status: 502 });
    }

    // SerpAPI returns fields like organic_results, local_results, knowledge_graph, etc.
    const organic = Array.isArray(json.organic_results) ? json.organic_results : [];
    // Normalize top results to { url, label, snippet }
    const sources = organic.slice(0, 5).map((r) => {
      return {
        url: r.link || r.url || r.cached_page_url || "",
        label: r.title || r.displayed_link || r.link || r.url || "",
        snippet: r.snippet || r.snippet_highlighted || "",
      };
    }).filter((s) => s.url);

    const confidence = scoreFromResults(sources);
    const evidenceSummary = summarizeTopResults(sources);

    return NextResponse.json({
      sources,
      confidence,
      evidenceSummary,
    });
  } catch (err) {
    console.error("Refresh route error:", err);
    return NextResponse.json({ error: "Internal server error", detail: err.message }, { status: 500 });
  }
}
