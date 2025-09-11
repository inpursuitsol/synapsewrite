// app/api/stream/refresh/route.js
import { NextResponse } from "next/server";

/**
 * Cached Refresh Sources endpoint
 * - POST { prompt }
 * - Uses in-memory Map cache with TTL to reduce SerpAPI calls
 * - Exposes CACHE_TTL (seconds) via env, default 600 (10 minutes)
 *
 * NOTE: for production cross-instance caching, replace Map with Redis / Upstash.
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY || null;
const SERPAPI_URL = "https://serpapi.com/search.json";
const CACHE_TTL = Number(process.env.CACHE_TTL || 600); // seconds

// Simple in-memory cache: Map<key, {expires: timestamp_ms, value: any}>
const cache = new Map();

function cacheKeyForPrompt(prompt) {
  return prompt
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function getCached(key) {
  const now = Date.now();
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < now) {
    cache.delete(key);
    console.log("[cache] expired ->", key);
    return null;
  }
  console.log("[cache] hit ->", key);
  return entry.value;
}

function setCached(key, value, ttlSeconds = CACHE_TTL) {
  const expires = Date.now() + ttlSeconds * 1000;
  cache.set(key, { expires, value });
  console.log("[cache] set ->", key, "ttl(s):", ttlSeconds);
}

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
  const m = snippet.match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}

function computeConfidenceFromResults(results) {
  if (!results || results.length === 0) return null;
  let score = 0.25;
  const n = Math.min(results.length, 6);
  score += 0.12 * n;

  const marketplaceDomains = ["flipkart.com", "amazon.in", "gsmarena.com", "91mobiles.com"];
  const domainBoost = results.reduce((acc, r) => {
    const url = (r.url || "").toLowerCase();
    return acc + (marketplaceDomains.some(d => url.includes(d)) ? 0.08 : 0);
  }, 0);
  score += Math.min(0.25, domainBoost);

  const years = results.map(r => parsePublishedDateFromSnippet(r.snippet)).filter(Boolean);
  if (years.length > 0) {
    const recentCount = years.filter(y => y >= 2024).length;
    score += Math.min(0.25, 0.08 * recentCount);
  }

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

    const key = cacheKeyForPrompt(prompt);
    const cached = getCached(key);
    if (cached) return NextResponse.json(cached);

    if (!SERPAPI_KEY) {
      const resp = {
        sources: [],
        confidence: null,
        evidenceSummary: "SERPAPI_KEY not configured on the server. Live searches are disabled.",
        warning: "SERPAPI_KEY_MISSING",
      };
      setCached(key, resp, 30);
      return NextResponse.json(resp);
    }

    let query = prompt;
    if (!/india/i.test(prompt)) query += " India";
    if (!/20\d{2}/i.test(prompt)) query += " 2025";

    let json;
    try {
      json = await fetchSerpApi(query, { hl: "en", gl: "in", num: 6 });
    } catch (err) {
      console.error("[refresh] SerpAPI fetch error:", err?.message || err);
      const resp = {
        sources: [],
        confidence: null,
        evidenceSummary: `Search failed: ${err?.message || "unknown error"}`,
        error: err?.message || String(err),
      };
      setCached(key, resp, 30);
      return NextResponse.json(resp, { status: 502 });
    }

    const organic = Array.isArray(json.organic_results) ? json.organic_results : [];
    const sources = organic.slice(0, 6).map((r) => ({
      url: r.link || r.url || r.displayed_link || "",
      label: r.title || r.displayed_link || r.link || "",
      snippet: r.snippet || r.snippet_highlighted || "",
    })).filter(s => s.url);

    const confidence = computeConfidenceFromResults(sources);
    const evidenceSummary = summarizeTopResults(sources);

    const result = { sources, confidence, evidenceSummary };

    setCached(key, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[refresh] fatal error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error", detail: err?.message || String(err) }, { status: 500 });
  }
}
