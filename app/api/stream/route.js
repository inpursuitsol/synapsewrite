// app/api/stream/route.js
import { NextResponse } from "next/server";

/**
 * Requirements (set as env vars):
 * - OPENAI_API_KEY
 * - SERPAPI_KEY
 *
 * This route expects POST { prompt: string } and will:
 * 1) call SerpAPI for live search results for the prompt,
 * 2) create messages (system + user + context),
 * 3) call OpenAI Chat Completions (streaming),
 * 4) return an SSE-like stream of "data: {...}\n\n" chunks client-side.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const SERPAPI_URL = "https://serpapi.com/search.json";

async function searchWeb(query) {
  const params = new URLSearchParams({
    q: query,
    engine: "google",            // SerpAPI param
    api_key: process.env.SERPAPI_KEY,
    num: "5",                    // top 5 results
    hl: "en"
  });

  const url = `${SERPAPI_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  // SerpAPI returns organic_results array (structure may vary)
  const items = (json.organic_results || []).slice(0, 5).map(r => ({
    title: r.title,
    snippet: r.snippet || r.snippet_text || r.summary || "",
    link: r.link || r.url || ""
  }));
  return items;
}

function buildMessages(prompt, searchResults) {
  const system = {
    role: "system",
    content:
      "You are a factual assistant that synthesizes current web information into a concise structured answer. " +
      "When asked for lists (e.g., top phones), return JSON that includes title, summary (1-2 sentences), and items (array) where each item has: rank, model, key_specs, why_pick, price_note, source_hint. " +
      "Prefer facts from the provided search snippets. If a fact is uncertain (price/availability), mark price_note as 'verify local retailer'. Do not invent dates or claim browsing unless supported by the snippets."
  };

  // Include search context as user message or assistant context
  const contextParts = searchResults.map((r, i) => {
    return `Result ${i + 1} — title: ${r.title}\nsnippet: ${r.snippet}\nlink: ${r.link}`;
  }).join("\n\n");

  const user = {
    role: "user",
    content:
      `User query: ${prompt}\n\n` +
      `Use the search snippets below to make a current list. Use the snippets as evidence; do not invent facts beyond them.\n\nSearch snippets:\n${contextParts}\n\n` +
      `Produce output as valid JSON only (no extra text) with fields: title, summary, items (items: [{rank, model, key_specs, why_pick, price_note, source_hint}]).`
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

    // 1) Live search
    let searchResults = [];
    try {
      searchResults = await searchWeb(prompt);
    } catch (err) {
      // If search fails, proceed with empty results but notify the model to be cautious.
      searchResults = [];
      console.warn("Search error:", err.message);
    }

    // 2) Build messages
    const messages = buildMessages(prompt, searchResults);

    // 3) Call OpenAI streaming chat completion (adjust model as needed)
    const openaiResp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or gpt-4o, gpt-4o-mini, or other available model
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

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // The OpenAI streaming pieces typically contain lines that may be "data: {json}" etc.
            // We'll pass them through, but ensure each SSE event ends with double newline.
            // Normalize line endings and forward.
            const normalized = chunk.replace(/\r/g, "").split(/\n/).filter(Boolean);
            for (const line of normalized) {
              // If line is like "data: {...}" forward as-is
              if (line.startsWith("data:")) {
                const payload = line.substring(5).trim();
                // write SSE event: data: <payload>\n\n
                const sse = `data: ${payload}\n\n`;
                controller.enqueue(new TextEncoder().encode(sse));
              } else {
                // fallback: wrap raw text
                const sse = `data: ${JSON.stringify({ text: line })}\n\n`;
                controller.enqueue(new TextEncoder().encode(sse));
              }
            }
          }
          // signal done
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        } finally {
          try { reader.releaseLock(); } catch {}
        }
      }
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
