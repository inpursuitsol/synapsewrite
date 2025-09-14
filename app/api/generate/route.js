// app/api/generate/route.js
import { NextResponse } from "next/server";

/**
 * ---------- KV guard: dynamic, safe usage of @vercel/kv ----------
 * Only loads @vercel/kv when KV_REST_API_URL and KV_REST_API_TOKEN are present.
 * Exposes getFromKV(key) and setToKV(key, value, opts={}) helpers.
 */
let _kvClient = null;
let _kvReady = false;

async function initKV() {
  if (_kvReady) return;
  _kvReady = true;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    // KV not configured — run without kv
    _kvClient = null;
    return;
  }
  try {
    // dynamic import so we don't crash when @vercel/kv or env isn't present
    const kvModule = await import("@vercel/kv");
    _kvClient = kvModule.kv;
  } catch (err) {
    console.warn("KV dynamic import failed; continuing without KV:", err?.message ?? err);
    _kvClient = null;
  }
}

export async function getFromKV(key) {
  await initKV();
  if (!_kvClient) return null;
  try {
    return await _kvClient.get(key);
  } catch (err) {
    console.warn("KV get error:", err?.message ?? err);
    return null;
  }
}

export async function setToKV(key, value, opts = {}) {
  await initKV();
  if (!_kvClient) return false;
  try {
    await _kvClient.set(key, value, opts);
    return true;
  } catch (err) {
    console.warn("KV set error:", err?.message ?? err);
    return false;
  }
}
/* ---------- end KV guard ---------- */


/**
 * Helper: small function to call OpenAI chat completions (uses REST API)
 * - Expects OPENAI_API_KEY in env (string).
 * - Returns the text result (string) or throws on error.
 */
async function callOpenAI(prompt, count = 1) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const body = {
    model: "gpt-4o-mini", // change to the model you prefer
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: String(prompt) }
    ],
    n: Number(count) || 1,
    max_tokens: 300
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    const msg = data?.error?.message ?? JSON.stringify(data);
    throw new Error(`OpenAI API error: ${msg}`);
  }

  // Combine outputs (if n > 1) into a single string separated by double-newlines
  const outputs = (data.choices || []).map(c => {
    // Chat completions may nest message -> content
    if (c.message && c.message.content) return c.message.content;
    if (c.text) return c.text;
    return "";
  }).filter(Boolean);

  return outputs.join("\n\n");
}

/**
 * POST /api/generate
 * Body: { prompt: string, count?: number }
 */
export async function POST(request) {
  try {
    // parse JSON
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const prompt = (body?.prompt ?? "").toString().trim();
    const count = body?.count ? Number(body.count) : 1;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Build a cache key (simple hashed-ish key)
    const cacheKey = `gen:${String(prompt).slice(0, 200)}::${count}`;

    // Try to return cached result if present
    const cached = await getFromKV(cacheKey);
    if (cached) {
      return NextResponse.json({ fromCache: true, result: cached }, { status: 200 });
    }

    // If OPENAI_API_KEY is not set, return a helpful fallback placeholder (non-fatal)
    if (!process.env.OPENAI_API_KEY) {
      // deterministic placeholder so your frontend still gets something
      const placeholder = `OpenAI key missing — placeholder for: "${prompt.substring(0, 100)}"`;
      // optionally cache for short time to avoid repeat calls
      await setToKV(cacheKey, placeholder, { ex: 30 }).catch(() => {});
      return NextResponse.json({ warning: "OPENAI_API_KEY not configured", result: placeholder }, { status: 200 });
    }

    // Call OpenAI
    let generated;
    try {
      generated = await callOpenAI(prompt, count);
    } catch (err) {
      // If the OpenAI call fails, return a 502 with message
      return NextResponse.json({ error: String(err.message ?? err) }, { status: 502 });
    }

    // Cache the result (short TTL)
    try {
      await setToKV(cacheKey, generated, { ex: 120 }); // cache for 120s
    } catch (err) {
      // ignore caching errors
    }

    return NextResponse.json({ fromCache: false, result: generated }, { status: 200 });
  } catch (err) {
    console.error("generate route error:", err);
    return NextResponse.json({ error: "Internal server error", message: String(err) }, { status: 500 });
  }
}
