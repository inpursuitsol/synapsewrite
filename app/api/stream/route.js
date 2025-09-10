// app/api/stream/route.js
import { NextResponse } from "next/server";

/**
 * Requirements (set as env vars):
 * - OPENAI_API_KEY
 * - SERPAPI_KEY (optional; route will still work without it)
 *
 * This route expects POST { prompt: string } and will:
 * 1) call SerpAPI for live search results for the prompt (if SERPAPI_KEY present),
 * 2) create messages (system + user + context),
 * 3) call OpenAI Chat Completions (streaming),
 * 4) return an SSE-like stream of "data: {...}\n\n" chunks client-side.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const SERPAPI_URL = "https://serpapi.com/search.json";

async function searchWeb(query) {
  if (!process.env.SERPAPI_KEY) return [];

  const params = new URLSearchParams({
    q: query,
    engine: "google",
    api_key: process.env.SERPAPI_KEY,
    num: "5",
    hl: "en",
  });

  const url = `${SERPAPI_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const items = (json.organic_results || []).slice(0, 5).map((r) => ({
    title: r.title,
    snippet: r.snippet || r.snippet_text || r.summary || "",
    link: r.link || r.url || "",
  }));
  return items;
}

function buildMessages(prompt, searchResults) {
  const system = {
    role: "system",
    content:
      "You are a factual assistant that synthesizes current web information into a concise structured answer. " +
      "When asked for lists (e.g., top phones), return JSON that includes title, summary, and items (array) where each item has: rank, model, key_specs, why_pick, price_note, source_hint. " +
      "Prefer facts from the provided search snippets. If a fact is uncertain (price/availability), mark price_note as 'verify local retailer'. Do not invent dates or claim browsing unless supported by the snippets.",
  };

  const contextParts = searchResults
    .map((r, i) => {
      return `Result ${i + 1} — title: ${r.title}\nsnippet: ${r.snippet}\nlink: ${r.link}`;
    })
    .join("\n\n");

  const user = {
    role: "user",
    content:
      `User query: ${prompt}\n\n` +
      `Use the search snippets below to make a current list. Use the snippets as evidence; do not invent facts beyond them.\n\nSearch snippets:\n${contextParts}\n\n` +
      `Produce output as valid JSON only (no extra text) with fields: title, summary, items (items: [{rank, model, key_specs, why_pick, price_note, source_hint}]).`,
  };

  return [system, user];
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = (body?.prompt || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
    }

    // 1) Live search (optional)
    let searchResults = [];
    try {
      searchResults = await searchWeb(prompt);
    } catch (err) {
      // proceed with empty results but log
      console.warn("Search error:", err?.message || err);
      searchResults = [];
    }

    // 2) Build messages for the model
    const messages = buildMessages(prompt, searchResults);

    // 3) Call OpenAI streaming chat completion
    const openaiResp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // change model as needed
        messages,
        temperature: 0.2,
        max_tokens: 700,
        stream: true,
      }),
    });

    if (!openaiResp.ok) {
      const text = await openaiResp.text();
      return NextResponse.json({ error: "openai_error", detail: text }, { status: 502 });
    }

    // 4) Stream response back as SSE-like "data: ..." chunks
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResp.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // OpenAI streaming sometimes sends lines like: "data: {...}\n\n"
            // Normalize, split into non-empty lines and forward each as an SSE event.
            const normalized = chunk.replace(/\r/g, "").split(/\n/).filter(Boolean);
            for (const line of normalized) {
              if (line.startsWith("data:")) {
                const payload = line.substring(5).trim();
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              } else {
                // fallback: treat as raw text payload
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: line })}\n\n`));
              }
            }
          }

          // signal done
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        } finally {
          try {
            reader.releaseLock();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "server_error", detail: String(err) }, { status: 500 });
  }
}
