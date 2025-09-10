// app/api/stream/route.js
import { NextResponse } from "next/server";

/**
 * Server route:
 * - Optionally calls SerpAPI when SERPAPI_KEY is set to gather live snippets
 * - Builds system+user messages (search context included when available)
 * - Calls OpenAI chat completions with stream: true
 * - Normalizes and forwards SSE-style "data: {...}\n\n" events to the client
 *
 * Env vars required:
 * - OPENAI_API_KEY  (required)
 * - SERPAPI_KEY     (optional — add if you want live web results)
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
    const txt = await res.text().catch(() => "");
    throw new Error(`Search failed: ${res.status} ${txt}`);
  }
  const json = await res.json().catch(() => ({}));
  const items = (json.organic_results || []).slice(0, 5).map((r) => ({
    title: r.title || "",
    snippet: r.snippet || r.snippet_text || r.summary || "",
    link: r.link || r.url || "",
  }));
  return items;
}

function buildMessages(prompt, searchResults) {
  const system = {
    role: "system",
    content:
      "You are a factual and conservative assistant. Use the provided search snippets as the primary source of truth when the user asks about recent facts. If a fact is uncertain, mark it as 'verify_local' or add a price_note 'verify local retailer'. Do not invent specifics beyond the snippets. When the user requests lists, prefer structured JSON if asked, and include short source hints in parentheses.",
  };

  let userContent = `User query: ${prompt}\n\n`;
  if (searchResults && searchResults.length) {
    userContent += "Search snippets (use these as evidence):\n";
    searchResults.forEach((r, i) => {
      userContent += `Result ${i + 1} — title: ${r.title}\nsnippet: ${r.snippet}\nlink: ${r.link}\n\n`;
    });
    userContent +=
      "\nUse the snippets above when answering. If you state facts not supported by the snippets, mark them as 'verify_local'.\n";
  } else {
    userContent +=
      "No search snippets available. Answer based on general knowledge and clearly mark uncertain facts where possible.\n";
  }

  const user = { role: "user", content: userContent };
  return [system, user];
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = (body?.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
    }

    // Optional: get search snippets
    let searchResults = [];
    try {
      searchResults = await searchWeb(prompt);
    } catch (err) {
      // Log and continue without snippets
      console.warn("searchWeb failed:", err?.message || err);
      searchResults = [];
    }

    const messages = buildMessages(prompt, searchResults);

    // Call OpenAI streaming endpoint
    const openaiResp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.4,
        max_tokens: 700,
        stream: true,
      }),
    });

    if (!openaiResp.ok) {
      const text = await openaiResp.text().catch(() => "");
      return NextResponse.json({ error: "openai_error", detail: text }, { status: 502 });
    }

    // Normalize OpenAI streaming into SSE-like events for the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResp.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // process full SSE events separated by "\n\n"
            let idx;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const event = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 2);

              const lines = event.split("\n").map((l) => l.trim()).filter(Boolean);
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const payload = line.substring(5).trim();

                if (payload === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }

                try {
                  const json = JSON.parse(payload);
                  const token = json.choices?.[0]?.delta?.content || "";
                  if (token) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`));
                  }
                } catch (err) {
                  // forward raw payload for debugging
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ raw: payload })}\n\n`));
                }
              }
            }
          }

          // flush any leftover buffer
          if (buffer.trim()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ raw: buffer.trim() })}\n\n`));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("stream error:", err);
          controller.error(err);
        } finally {
          try { reader.releaseLock(); } catch {}
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
    console.error("route error:", err);
    return NextResponse.json({ error: "server_error", detail: String(err) }, { status: 500 });
  }
}
