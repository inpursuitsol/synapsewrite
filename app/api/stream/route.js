// app/api/stream/route.js
import { NextResponse } from "next/server";

/**
 * Robust stream route with fallback:
 *  - Streams OpenAI (SSE), extracts assistant text (delta.content)
 *  - Buffers fullText
 *  - If no assistant text arrived, makes a non-stream (blocking) request and returns that content
 *
 * Requirements:
 *  - process.env.OPENAI_API_KEY must be set
 *
 * Usage:
 * POST /api/stream  { prompt: "...", maxTokens?: 800 }
 * Response: plain text (assistant content, may include trailing SEO JSON)
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini-2024-07-18"; // change if needed

function nowTag() {
  return new Date().toISOString();
}

async function nonStreamCompletion(prompt, maxTokens = 800) {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "You are a helpful assistant that outputs a clean article in plain text followed by a final SEO JSON block. Do NOT include code fences or labels." },
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
  // Support both Chat API shape and older shape
  const text = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || "";
  return text;
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured on server" }, { status: 500 });
    }

    const payload = await req.json().catch(() => ({}));
    const prompt = (payload.prompt || "").trim();
    const maxTokens = payload.maxTokens || 800;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Build request for streaming
    const openaiReq = {
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs a clean article in plain text followed by a final SEO JSON block. Do NOT include code fences or labels." },
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
      // fallback: try non-stream request
      try {
        const fallbackText = await nonStreamCompletion(prompt, maxTokens);
        return new Response(fallbackText || "[No assistant text returned]", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (e) {
        return NextResponse.json({ error: "OpenAI error", detail: txt || e.message }, { status: 502 });
      }
    }

    // If streaming body exists, parse SSE lines but buffer rather than immediately respond,
    // so we can fallback to non-stream if no content seen.
    if (!openaiRes.body) {
      // no streaming body — fall back to non-stream
      console.warn(nowTag(), "No streaming body from OpenAI - falling back to non-stream.");
      const fallbackText = await nonStreamCompletion(prompt, maxTokens);
      return new Response(fallbackText || "[No assistant text returned]", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let sawAnyContent = false;
    let accumulated = "";

    // Read the stream fully (we buffer all text). This delays client response until we finish,
    // but ensures we can fallback if nothing useful arrives.
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // split by newline (SSE lines)
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // keep last partial

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          if (!line.startsWith("data:")) continue;
          const payload = line.replace(/^data:\s*/, "");

          if (payload === "[DONE]") {
            // finished
            break;
          }

          let parsed;
          try {
            parsed = JSON.parse(payload);
          } catch (e) {
            // ignore unparsable lines
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

      // flush any leftover data line
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
    } catch (err) {
      console.error(nowTag(), "Error reading OpenAI stream:", err?.message || err);
      // In case of stream read problems, try a non-stream fallback
      try {
        const fallbackText = await nonStreamCompletion(prompt, maxTokens);
        return new Response(fallbackText || "[No assistant text returned]", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (e) {
        return NextResponse.json({ error: "Stream read error and fallback failed", detail: String(e) }, { status: 502 });
      }
    } finally {
      try { reader.releaseLock(); } catch (e) {}
    }

    // If we saw assistant content in the streaming deltas, return it.
    if (sawAnyContent && accumulated.trim()) {
      // Log small snippet for debugging
      console.log(nowTag(), "Stream produced content, length:", accumulated.length, "snippet:", accumulated.slice(0, 200).replace(/\n/g, " "));
      return new Response(accumulated, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // ELSE: nothing useful arrived in the stream → do a non-stream request as fallback
    console.warn(nowTag(), "Stream returned no assistant deltas. Performing non-stream fallback request.");
    try {
      const fallbackText = await nonStreamCompletion(prompt, maxTokens);
      if (fallbackText && fallbackText.trim()) {
        console.log(nowTag(), "Fallback non-stream produced content, length:", fallbackText.length);
        return new Response(fallbackText, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } else {
        console.warn(nowTag(), "Fallback produced no assistant content either.");
        return new Response("[No assistant text returned]", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    } catch (e) {
      console.error(nowTag(), "Fallback non-stream failed:", e?.message || e);
      return NextResponse.json({ error: "No assistant text returned and fallback failed", detail: String(e) }, { status: 502 });
    }
  } catch (err) {
    console.error(nowTag(), "Route fatal error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}
