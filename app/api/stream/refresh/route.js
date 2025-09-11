// app/api/stream/refresh/route.js
/**
 * Cached Refresh Sources endpoint with:
 * - Redis-backed cache (if REDIS_URL provided) or in-memory fallback
 * - Per-IP rate-limiting using Redis or in-memory fallback
 * - Calibrated confidence heuristic
 * - Structured logging via sendLog()
 *
 * Env:
 *  - SERPAPI_KEY (recommended)
 *  - REDIS_URL (optional)
 *  - CACHE_TTL (seconds, default 600)
 *  - RATE_LIMIT_MAX (default 10)
 *  - RATE_LIMIT_WINDOW (seconds, default 60)
 */

import { NextResponse } from "next/server";
import Redis from "ioredis";
import { sendLog } from "@/lib/logger";

const SERPAPI_KEY = process.env.SERPAPI_KEY || null;
const SERPAPI_URL = "https://serpapi.com/search.json";
const CACHE_TTL = Number(process.env.CACHE_TTL || 600); // seconds
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 10);
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW || 60); // seconds

const REDIS_URL = process.env.REDIS_URL || null;
let redis = null;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redis.on("error", (e) => console.error("[redis] error:", e?.message || e));
  } catch (e) {
    console.warn("[redis] init failed:", e?.message || e);
    redis = null;
  }
}

// in-memory fallback storage
const inMemoryCache = new Map();

function cacheKeyForPrompt(prompt) {
  return "refresh:" + prompt.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
}

async function getCached(key) {
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[cache] redis get failed:", e?.message || e);
      return null;
    }
  } else {
    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      inMemoryCache.delete(key);
      console.log("[cache] expired ->", key);
      return null;
    }
    console.log("[cache] hit ->", key);
    return entry.value;
  }
}

async function setCached(key, value, ttlSeconds = CACHE_TTL) {
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch (e) {
      console.warn("[cache] redis set failed:", e?.message || e);
    }
  }
  // in-memory fallback
  inMemoryCache.set(key, { expires: Date.now() + ttlSeconds * 1000, value });
  console.log("[cache] set (memory) ->", key, "ttl(s):", ttlSeconds);
}

async function checkRateLimit(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  const rlKey = `rl_refresh:${ip}`;

  try {
    if (redis) {
      const current = await redis.incr(rlKey);
      if (current === 1) await redis.expire(rlKey, RATE_LIMIT_WINDOW);
      return { allowed: current <= RATE_LIMIT_MAX, remaining: Math.max(0, RATE_LIMIT_MAX - current), current, ip };
    } else {
      const entry = inMemoryCache.get(rlKey) || { count: 0, expiresAt: Date.now() + RATE_LIMIT_WINDOW * 1000 };
      if (Date.now() > entry.expiresAt) {
        entry.count = 1;
        entry.expiresAt = Date.now() + RATE_LIMIT_WINDOW * 1000;
      } else {
        entry.count += 1;
      }
      inMemoryCache.set(rlKey, entry);
      return { allowed: entry.count <= RATE_LIMIT_MAX, remaining: Math.max(0, RATE_LIMIT_MAX - entry.count), current: entry.count, ip };
    }
  } catch (e) {
    console.warn("[rate] check failed, allowing request:", e?.message || e);
    return { allowed: true, remaining: RATE_LIMIT_MAX, current: 0, ip: "unknown" };
  }
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
      await sendLog({ event: "refresh.bad_request" });
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Rate-limit
    const rl = await checkRateLimit(req);
    if (!rl.allowed) {
      await sendLog({ event: "refresh.rate_limited", ip: rl.ip, current: rl.current });
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: RATE_LIMIT_WINDOW }, { status: 429 });
    }

    const key = cacheKeyForPrompt(prompt);
    const cached = await getCached(key);
    if (cached) {
      await sendLog({ event: "refresh.cache_hit", prompt_snippet: prompt.slice(0,120), ip: rl.ip });
      return NextResponse.json(cached);
    }

    if (!SERPAPI_KEY) {
      const resp = {
        sources: [],
        confidence: null,
        evidenceSummary: "SERPAPI_KEY not configured on the server. Live searches are disabled.",
        warning: "SERPAPI_KEY_MISSING",
      };
      await setCached(key, resp, 30);
      await sendLog({ event: "refresh.no_serp_key", prompt_snippet: prompt.slice(0,120), ip: rl.ip });
      return NextResponse.json(resp);
    }

    // Build search query
    let query = prompt;
    if (!/india/i.test(prompt)) query += " India";
    if (!/20\\d{2}/i.test(prompt)) query += " 2025";

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
      await setCached(key, resp, 30);
      await sendLog({ event: "refresh.error", error: err?.message || String(err), prompt_snippet: prompt.slice(0,120), ip: rl.ip });
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

    await setCached(key, result, CACHE_TTL);
    await sendLog({ event: "refresh.result", prompt_snippet: prompt.slice(0,120), sourcesCount: sources.length, confidence, ip: rl.ip });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[refresh] fatal error:", err?.message || err);
    await sendLog({ event: "refresh.fatal", error: err?.message || String(err) });
    return NextResponse.json({ error: "Internal server error", detail: err?.message || String(err) }, { status: 500 });
  }
}
