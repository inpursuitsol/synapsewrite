// app/api/stream/refresh/route.js
import { NextResponse } from "next/server";

/**
 * Refresh sources endpoint (improved)
 * - POST { prompt }
 * - Requires process.env.SERPAPI_KEY (optional; route will respond gracefully if missing)
 *
 * Returns:
 * { sources: [{url,label,snippet,publishedAt?}], confidence: number|null, evidenceSummary: string, warning?: string }
 *
 * Confidence is a heuristic (0..1) not a guarantee.
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY || null;
const SERPAPI_URL = "https://serpapi.com/search.json";

async function fetchSerpApi(query, options = {}) {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    hl: options.hl || "en",
    gl: options.gl || "in",
    num: String(options.num || 6),
    api_key: SERPAPI_KEY,
  });
  const url = `${SERPAPI_URL}?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SerpAPI error ${resp.status}: ${txt}`);
  }
  return resp.json();
}

function parsePublishedDateFromSnippet(snippet) {
  if (!snippet) return null;
  const m = snippet.match(/(20\d{2})/); // find a year like 2023/2024/2025
  return m ? Number(m[1]) : null;
}

function computeConfidenceFromResults(results) {
  // Heuristic: base 0.15
  if (!results || results.length === 0) return null; // unknown
  let score = 0.25;
  const n = Math.min(results.length, 6);
  score += 0.12 * n; // more results -> higher score

  // bump if we detect marketplace/known domains (indicates availability)
  const marketplaceDomains = ["flipkart.com", "amazon.in", "gsmarena.com", "91mobiles.com"];
  const domainBoost = results.reduce((acc, r) => {
    const url = (r.url || "").toLowerCase();
    return acc + (marketplaceDomains.some(d => url.includes(d)) ? 0.08 : 0);
  }, 0);
  score += Math.min(0.25, domainBoost);

  // Recentness: if many snippets reference 2024/2025 -> bump
  const years = results.map(r => parsePublishedDateFromSnippet(r.snippet)).filter(Boolean);
  if (years.length > 0) {
    const recentCount = years.filter(y => y >= 2024).length;
    score += Math.min(0.25, 0.08 * recentCount);
  }

  // clamp to 0..0.95
  score = Math.max(0, Math.min(0.95, score));
  return Number(score.toFixed(2));
}

function summarizeTopResults(results) {
  if (!results || results.length === 0) return "No relevant results found.";
  const top = results.slice(0, 3);
  const parts = top.map((r) => {
    const t = r.label || r.title || (r.url ? new URL(r.url).hostname : "");
    const s = (r.snippet || "").replace(/\s+/g, " ").trim();
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
      // graceful fallback response (no live search available)
      return NextResponse.json({
        sources: [],
        confidence: null,
        evidenceSummary: "SERPAPI_KEY not configured on the server. Live searches are disabled.",
        warning: "SERPAPI_KEY_MISSING",
      });
    }

    // Build a slightly focused query (bias to India + 2025)
    // If prompt already contains 'India' or '2025', preserve it; else add context.
    let query = prompt;
    if (!/india/i.test(prompt)) query += " India";
    if (!/202[0-9]/i.test(prompt)) query += " 2025";

    let json;
    try {
      json = await fetchSerpApi(query, { hl: "en", gl: "in", num: 6 });
    } catch (err) {
      console.error("SerpAPI error:", err?.message || err);
      return NextResponse.json({
        sources: [],
        confidence: null,
        evidenceSummary: `Search failed: ${err?.message || "unknown error"}`,
        error: err?.message || String(err),
      }, { status: 502 });
    }

    const organic = Array.isArray(json.organic_results) ? json.organic_results : [];
    const sources = organic.slice(0, 6).map((r) => {
      return {
        url: r.link || r.url || r.displayed_link || "",
        label: r.title || r.displayed_link || r.link || "",
        snippet: r.snippet || r.snippet_highlighted || "",
      };
    }).filter(s => s.url);

    const confidence = computeConfidenceFromResults(sources);
    const evidenceSummary = summarizeTopResults(sources);

    return NextResponse.json({
      sources,
      confidence, // may be null if no useful results
      evidenceSummary,
    });
  } catch (err) {
    console.error("Refresh route fatal error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error", detail: err?.message || String(err) }, { status: 500 });
  }
}
