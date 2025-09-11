// app/api/stream/route.js
/**
 * Robust streaming route for article generation (OpenAI) with:
 * - SSE stream parsing (extracts choices[].delta.content)
 * - Non-stream fallback (stream: false) if stream yields no assistant content
 * - Per-IP rate limiting (Redis if REDIS_URL set, otherwise in-memory)
 * - Server-side structured logging via sendLog()
 *
 * Requirements:
 *  - process.env.OPENAI_API_KEY
 *  - Optional: process.env.REDIS_URL for cross-instance rate-limits
 *  - Optional envs:
 *      STREAM_RATE_LIMIT_MAX (default 6)
 *      STREAM_RATE_LIMIT_WINDOW (seconds, default 60)
 */

import Redis from "ioredis";
import { sendLog } from "@/lib/logger";

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
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || req.headers.get("x-client-ip") || "unknown";
}

async function checkStreamRateLimit(req) {
  const ip = getIpFromReq(req) || "unknown";
  const rlKey = `rl_stream:${ip}`;

  if (redisClient) {
    try {
      const cur = await redisClient.incr(rlKey);
      if (cur === 1) await redisClient.expire(rlKey, STREAM_RATE_LIMIT_WINDOW);
      const allowed = cur <= STREAM_RATE_LIMIT_MAX;
      return { allowed, remaining: Math.max(0, STREAM_RATE_LIMIT_MAX - cur), current: cur, ip };
    } catch (e) {
      console.warn("[rate] redis check failed, falling back to memory:", e?.message || e);
    }
  }

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
  const text = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || "";
  return text;
}

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
    return { body: text.trim(), seoObj: null };
  }
}

export async function POST(req) {
  try {
    // Rate-limit check
    const rl = await checkStreamRateLimit(req);
    if (!rl.allowed) {
      await sendLog({ event: "generate.rate_limited", ip: rl.ip, current: rl.current });
      console.warn(nowTag(), "Rate limit exceeded for", rl.ip, "current:", rl.current);
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfter: STREAM_RATE_LIMIT_WINDOW }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error(nowTag(), "OPENAI_API_KEY not configured");
      await sendLog({ event: "generate.error", error: "OPENAI_API_KEY not configured", ip: rl.ip });
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured on server" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const prompt = (payload.prompt || "").trim();
    const maxTokens = payload.maxTokens || 800;

    if (!prompt) {
      await sendLog({ event: "generate.bad_request", ip: rl.ip });
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Log request
    await sendLog({ event: "generate.request", prompt_snippet: prompt.slice(0, 200), ip: rl.ip, maxTokens });

    console.log(nowTag(), "Generate requested — ip:", rl.ip, "prompt_snippet:", prompt.slice(0, 200));

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
      console.error(nowTag(), "OpenAI stream responded non-200:", openaiRes.status);
      await sendLog({ event: "generate.openai_non_200", status: openaiRes.status, detail: txt?.slice(0, 500) || "" , ip: rl.ip});
      try {
        const fallback = await nonStreamCompletion(prompt, maxTokens);
        const { body, seoObj } = extractSeoBlockFromText(fallback);
        const articleLen = (body || "").split(/\s+/).filter(Boolean).length;
        const sourcesCount = Array.isArray(seoObj?.sources) ? seoObj.sources.length : 0;
        const confidence = seoObj?.confidence ?? null;
        await sendLog({ event: "generate.fallback_result", words: articleLen, sourcesCount, confidence, ip: rl.ip });
        return new Response(fallback || "[No assistant text returned]", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (e) {
        await sendLog({ event: "generate.error", error: e?.message || String(e), ip: rl.ip });
        return new Response(JSON.stringify({ error: "OpenAI error", detail: txt || e?.message }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (!openaiRes.body) {
      console.warn(nowTag(), "No streaming body from OpenAI — using non-stream fallback");
      const fallback = await nonStreamCompletion(prompt, maxTokens);
      const { body, seoObj } = extractSeoBlockFromText(fallback);
      const articleLen = (body || "").split(/\s+/).filter(Boolean).length;
      const sourcesCount = Array.isArray(seoObj?.sources) ? seoObj.sources.length : 0;
      const confidence = seoObj?.confidence ?? null;
      await sendLog({ event: "generate.fallback_result", words: articleLen, sourcesCount, confidence, ip: rl.ip });
      return new Response(fallback || "[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // Parse SSE
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

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();

        for (let rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          if (!line.startsWith("data:")) continue;
          const payload = line.replace(/^data:\s*/, "");
          if (payload === "[DONE]") break;

          let parsed;
          try {
            parsed = JSON.parse(payload);
          } catch (e) {
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
            // ignore
          }
        }
      }

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
          } catch (e) {}
        }
      }
    } catch (readErr) {
      console.error(nowTag(), "Error reading OpenAI stream:", readErr?.message || readErr);
      await sendLog({ event: "generate.stream_read_error", error: readErr?.message || String(readErr), ip: rl.ip });
      try {
        const fallback = await nonStreamCompletion(prompt, maxTokens);
        const { body, seoObj } = extractSeoBlockFromText(fallback);
        const articleLen = (body || "").split(/\s+/).filter(Boolean).length;
        const sourcesCount = Array.isArray(seoObj?.sources) ? seoObj.sources.length : 0;
        const confidence = seoObj?.confidence ?? null;
        await sendLog({ event: "generate.fallback_result", words: articleLen, sourcesCount, confidence, ip: rl.ip });
        return new Response(fallback || "[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (e) {
        await sendLog({ event: "generate.error", error: e?.message || String(e), ip: rl.ip });
        return new Response(JSON.stringify({ error: "Stream read error and fallback failed", detail: String(e) }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    } finally {
      try { reader.releaseLock(); } catch (e) {}
    }

    if (sawAnyContent && accumulated.trim()) {
      const snippet = accumulated.slice(0, 200).replace(/\n/g, " ");
      const { body, seoObj } = extractSeoBlockFromText(accumulated);
      const articleLen = (body || "").split(/\s+/).filter(Boolean).length;
      const sourcesCount = Array.isArray(seoObj?.sources) ? seoObj.sources.length : 0;
      const confidence = seoObj?.confidence ?? null;
      await sendLog({ event: "generate.result", words: articleLen, sourcesCount, confidence, ip: rl.ip });
      console.log(nowTag(), "Stream produced content — words:", articleLen, "sources:", sourcesCount, "confidence:", confidence, "snippet:", snippet);

      return new Response(accumulated, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    console.warn(nowTag(), "Stream returned no assistant deltas. Performing non-stream fallback.");
    await sendLog({ event: "generate.no_stream_content", ip: rl.ip });
    try {
      const fallback = await nonStreamCompletion(prompt, maxTokens);
      const { body, seoObj } = extractSeoBlockFromText(fallback);
      const articleLen = (body || "").split(/\s+/).filter(Boolean).length;
      const sourcesCount = Array.isArray(seoObj?.sources) ? seoObj.sources.length : 0;
      const confidence = seoObj?.confidence ?? null;
      await sendLog({ event: "generate.fallback_result", words: articleLen, sourcesCount, confidence, ip: rl.ip });
      return new Response(fallback || "[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (e) {
      await sendLog({ event: "generate.error", error: e?.message || String(e), ip: rl.ip });
      console.error(nowTag(), "Fallback non-stream failed:", e?.message || e);
      return new Response("[No assistant text returned]", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  } catch (err) {
    console.error(nowTag(), "Route fatal error:", err?.message || err);
    try { await sendLog({ event: "generate.fatal", error: err?.message || String(err) }); } catch (e) {}
    return new Response(JSON.stringify({ error: "Internal server error", detail: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
