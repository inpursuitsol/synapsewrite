// app/api/stream/route.js
/**
 * Robust streaming route for article generation (OpenAI) with:
 * - SSE stream parsing (extracts choices[].delta.content)
 * - Non-stream fallback (stream: false) if stream yields no assistant content
 * - Per-IP rate limiting (Redis if REDIS_URL set, otherwise in-memory)
 * - Server-side logging of key events (prompt, article length, seo info)
 *
 * Requirements:
 *  - process.env.OPENAI_API_KEY
 *  - Optional: process.env.REDIS_URL for cross-instance rate-limits
 *  - Optional envs:
 *      STREAM_RATE_LIMIT_MAX (default 6)
 *      STREAM_RATE_LIMIT_WINDOW (seconds, default 60)
 *
 * NOTE:
 * - This file returns plain text (the assistant content). The frontend's `extractSeoBlock`
 *   should parse a trailing SEO JSON block if your model appends one.
 */

import Redis from "ioredis";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini-2024-07-18";

const REDIS_URL = process.env.REDIS_URL || null;
let redisClient = null;
if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL);
    redisClient.on("error", (e) => console.error("[redis] error:", e?.message || e));
  } catch (e) {
    console.warn("[redis] init failed:", e?.message || e);
    redisClient = null;
  }
}

const STREAM_RATE_LIMIT_MAX = Number(process.env.STREAM_RATE_LIMIT_MAX || 6);
const STREAM_RATE_LIMIT_WINDOW = Number(process.env.STREAM_RATE_LIMIT_WINDOW || 60); // seconds

// in-memory fallback for rate-limiting (per-instance)
const rlMemory = new Map();

function getIpFromReq(req) {
  // Next.js Request headers available via req.headers.get()
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || req.headers.get("x-client-ip") || "unknown";
}

async function checkStreamRateLimit(req) {
  const ip = getIpFromReq(req) || "unknown";
  const rlKey = `rl_stream:${ip}`;

  // Redis-backed
  if (redisClient) {
    try {
      const cur = await redisClient.incr(rlKey);
      if (cur === 1) {
        await redisClient.expire(rlKey, STREAM_RATE_LIMIT_WINDOW);
      }
      const allowed = cur <= STREAM_RATE_LIMIT_MAX;
      return { allowed, remaining: Math.max(0, STREAM_RATE_LIMIT_MAX - cur), current: cur, ip };
    } catch (e) {
      console.warn("[rate] redis check failed, falling back to memory:", e?.message || e);
      // fall through to in-memory
    }
  }

  // in-memory fallback
  const now = Date.now();
  const entry = rlMemory.get(rlKey) || { count: 0, expiresAt: now + STREAM_RATE_LIMIT_WINDOW * 1000 };
  if (now > entry.expiresAt) {
    entry.count = 1;
    entry.expiresAt = now + STREAM_RATE_LIMIT_WINDOW * 1000;
  } else {
    entry.count += 1;
  }
  rlMemory.set(rlKey, entry);
  const allowed = entry.count <= STREAM_RATE_LIMIT_MAX;
  return { allowed, remaining: Math.max(0, STREAM_RATE_LIMIT_MAX - entry.count), current: entry.count, ip };
}

function nowTag() {
  return new Date().toISOString();
}

async function nonStreamCompletion(prompt, maxTokens = 800) {
  const body = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that outputs a clean article in plain text followed by a final SEO JSON block. Do NOT include code fences or labels. The final block must be valid JSON with fields: title, meta, confidence (0..1), sources (array).",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
    stream: false,
  };

  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`OpenAI non-stream error ${r.status}: ${txt}`);
  }

  const json = await r.json();
  // try to support both shapes
  const text = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || "";
  return text;
}

// parse trailing SEO JSON block (loosely)
function extractSeoBlockFromText(text) {
  if (!text) return { body: text || "", seoObj: null };
  const jsonMatch = text.match(/\{[\s\S]*\}\s*$/);
  if (!jsonMatch) return { body: text.trim(), seoObj: null };
  const jsonText = jsonMatch[0];
  try {
    const seoObj = JSON.parse(jsonText);
    const body = text.replace(jsonText, "").trim();
    return { body, seoObj };
  } catch (e) {
    // invalid JSON, return as body
    return { body: text.trim(), seoObj: null };
  }
}

export async function POST(req) {
  try {
    // Rate-limit check
    const rl = await checkStreamRateLimit(req);
    if (!rl.allowed) {
      console.warn(nowTag(), "Rate limit exceeded for", rl.ip, "current:", rl.current);
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfter: STREAM_RATE_LIMIT_WINDOW }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error(nowTag(), "OPENAI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured on server" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const prompt = (payload.prompt || "").trim();
    const maxTokens = payload.maxTokens || 800;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    console.log(nowTag(), "Generate requested — ip:", rl.ip, "prompt_snippet:", prompt.slice(0, 200));

    // Build streaming request
    const openaiReq = {
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that outputs a clean article in plain text followed by a final SEO JSON block. Do NOT include code fences or labels. The final block must be a valid JSON object with fields: title, meta, confidence, sources (array).",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
      stream: true,
    };

    const openaiRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiReq),
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(nowTag(), "OpenAI stream responded non-200:", openaiRes.status, txt.slice(0, 800));
      // Try non-stream fallback
      try {
        const fallback = await nonStreamCompletion(prompt, maxTokens);
        // log fallback result length
        const snippet = (fallback || "").slice(0, 200).replace(/\n/g, " ");
        console.log(nowTag(), "Fallback non-stream produced length:", (fallback || "").length, "snippet:", snippet);
        return new Response(fallback || "[No assistant text returned]", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "OpenAI error", detail: txt || e.message }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (!openaiRes.body) {
      console.warn(nowTag(), "No streaming body from OpenAI — using non-stream fallback");
      const fallback = await nonStreamCompletion(prompt, maxTokens);
      return new Response(fallback || "[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // Parse the SSE stream, buffer content (so we can fallback if empty)
    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let accumulated = "";
    let sawAnyContent = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split SSE lines
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // keep last partial

        for (let rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          if (!line.startsWith("data:")) continue;
          const payload = line.replace(/^data:\s*/, "");
          if (payload === "[DONE]") {
            // stream finished marker
            break;
          }

          let parsed;
          try {
            parsed = JSON.parse(payload);
          } catch (e) {
            // Non-JSON payload — skip
            continue;
          }

          try {
            const choices = parsed.choices || [];
            for (let ch of choices) {
              const delta = ch.delta || {};
              const piece = delta.content || ch.message?.content || ch.text || "";
              if (piece && typeof piece === "string") {
                sawAnyContent = true;
                accumulated += piece;
              }
            }
          } catch (e) {
            // ignore chunk-level errors
          }
        }
      }

      // flush leftover buffer if it contains data:
      if (buffer && buffer.includes("data:")) {
        const leftover = buffer.replace(/^data:\s*/, "").trim();
        if (leftover && leftover !== "[DONE]") {
          try {
            const parsed = JSON.parse(leftover);
            const choices = parsed.choices || [];
            for (let ch of choices) {
              const piece = ch.delta?.content || ch.message?.content || ch.text || "";
              if (piece) {
                sawAnyContent = true;
                accumulated += piece;
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (readErr) {
      console.error(nowTag(), "Error reading OpenAI stream:", readErr?.message || readErr);
      // attempt non-stream fallback
      try {
        const fallback = await nonStreamCompletion(prompt, maxTokens);
        return new Response(fallback || "[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Stream read error and fallback failed", detail: String(e) }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {}
    }

    // If we got content, return it. Otherwise fallback to non-stream.
    if (sawAnyContent && accumulated.trim()) {
      // Log summary: length and SEO block if present
      const snippet = accumulated.slice(0, 200).replace(/\n/g, " ");
      const { body, seoObj } = extractSeoBlockFromText(accumulated);
      const articleLen = (body || "").split(/\s+/).filter(Boolean).length;
      const sourcesCount = Array.isArray(seoObj?.sources) ? seoObj.sources.length : 0;
      const confidence = seoObj?.confidence ?? null;
      console.log(nowTag(), "Stream produced content — words:", articleLen, "sources:", sourcesCount, "confidence:", confidence, "snippet:", snippet);

      // Return the raw accumulated text (contains body + trailing SEO JSON if model appended it)
      return new Response(accumulated, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // No assistant deltas detected -> perform non-stream fallback
    console.warn(nowTag(), "Stream returned no assistant deltas. Performing non-stream fallback.");
    try {
      const fallback = await nonStreamCompletion(prompt, maxTokens);
      const { body, seoObj } = extractSeoBlockFromText(fallback);
      const articleLen = (body || "").split(/\s+/).filter(Boolean).length;
      const sourcesCount = Array.isArray(seoObj?.sources) ? seoObj.sources.length : 0;
      const confidence = seoObj?.confidence ?? null;
      console.log(nowTag(), "Fallback produced content — words:", articleLen, "sources:", sourcesCount, "confidence:", confidence);
      return new Response(fallback || "[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (e) {
      console.error(nowTag(), "Fallback non-stream failed:", e?.message || e);
      return new Response("[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  } catch (err) {
    console.error(nowTag(), "Route fatal error:", err?.message || err);
    return new Response(JSON.stringify({ error: "Internal server error", detail: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
