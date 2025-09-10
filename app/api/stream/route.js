// app/api/stream/route.js
import { NextResponse } from "next/server";

/**
 * Robust SSE -> plain-text proxy for OpenAI streaming responses.
 * - Extracts assistant content from streamed SSE chunks (choices[].delta.content)
 * - Falls back to non-streamed JSON responses (choices[0].message.content)
 * - Logs short debug snippets to server console for diagnosis.
 *
 * Requirements:
 * - process.env.OPENAI_API_KEY
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini-2024-07-18";

function nowTag() {
  return new Date().toISOString();
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || "";
    const maxTokens = body.maxTokens || 800;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const openaiReqBody = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that outputs a clean article in plain text followed by a final SEO JSON block. Do NOT emit code fences or label the JSON. The final chunk should be a valid JSON object containing title, meta, confidence, sources (array).",
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
      body: JSON.stringify(openaiReqBody),
    });

    // If OpenAI returned non-stream JSON (rare if stream=true but possible), handle gracefully.
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(nowTag(), "OpenAI responded with non-200:", openaiRes.status, txt.slice(0, 800));
      return NextResponse.json({ error: "OpenAI error", detail: txt }, { status: 502 });
    }

    // If we have a streaming body, parse SSE; otherwise, try to parse as JSON.
    if (!openaiRes.body) {
      const txt = await openaiRes.text();
      console.warn(nowTag(), "No streaming body, raw:", txt.slice(0, 800));
      try {
        const parsed = JSON.parse(txt);
        const altText = parsed?.choices?.[0]?.message?.content || "";
        if (altText) {
          return new Response(altText, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      } catch (e) {
        // Fall through to error
      }
      return NextResponse.json({ error: "No streaming response body" }, { status: 502 });
    }

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let fullText = ""; // accumulate all assistant text
    let sawAnyContent = false;
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Split by EOL since SSE uses newline-delimited messages
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); // leftover partial line

            for (let rawLine of lines) {
              const line = rawLine.trim();
              if (!line) continue;
              // Looking for: data: {...} or data: [DONE]
              if (!line.startsWith("data:")) continue;
              const payload = line.replace(/^data:\s*/, "");

              if (payload === "[DONE]") {
                // close stream and return
                controller.close();
                return;
              }

              // Attempt to parse JSON payload
              let parsed;
              try {
                parsed = JSON.parse(payload);
              } catch (err) {
                // skip unparsable payloads
                console.warn(nowTag(), "Unparseable SSE payload (skipping). snippet:", payload.slice(0, 200));
                continue;
              }

              // Robust extraction of assistant text:
              // 1) choices[*].delta.content (streaming normal)
              // 2) choices[*].delta may contain nested structures (safety)
              // 3) choices[*].message?.content (some APIs)
              try {
                const choices = parsed.choices || [];
                for (let ch of choices) {
                  // 1. delta.content (standard streaming)
                  const delta = ch.delta || {};
                  if (delta && typeof delta === "object") {
                    // Some SDKs return text fragments under delta.content
                    if (typeof delta.content === "string" && delta.content.length > 0) {
                      const piece = delta.content;
                      sawAnyContent = true;
                      fullText += piece;
                      controller.enqueue(new TextEncoder().encode(piece));
                      continue;
                    }
                  }

                  // 2. choices[*].message?.content (non-stream fallback)
                  const messageContent = ch.message?.content || ch.text || "";
                  if (messageContent) {
                    sawAnyContent = true;
                    fullText += messageContent;
                    controller.enqueue(new TextEncoder().encode(messageContent));
                  }
                }
              } catch (err) {
                console.warn(nowTag(), "Error extracting chunk:", err?.message || err);
              }
            }
          }

          // flush leftover buffer if it contains a data: line
          if (buffer && buffer.includes("data:")) {
            const leftoverPayload = buffer.replace(/^data:\s*/, "").trim();
            if (leftoverPayload && leftoverPayload !== "[DONE]") {
              try {
                const parsed = JSON.parse(leftoverPayload);
                const choices = parsed.choices || [];
                for (let ch of choices) {
                  const piece = ch.delta?.content || ch.message?.content || ch.text || "";
                  if (piece) {
                    sawAnyContent = true;
                    fullText += piece;
                    controller.enqueue(new TextEncoder().encode(piece));
                  }
                }
              } catch (e) {
                // ignore
              }
            }
          }

          // If we never saw any content, enqueue a friendly message so frontend doesn't show blank.
          if (!sawAnyContent) {
            const hint = "\n\n[Note from server: No assistant text arrived in the stream. Please try 'Refresh sources' or regenerate.]\n\n";
            controller.enqueue(new TextEncoder().encode(hint));
            console.warn(nowTag(), "Stream finished with no content. Forwarded hint to client.");
          }

          controller.close();
        } catch (err) {
          console.error(nowTag(), "Stream parsing error:", err?.message || err);
          try {
            controller.error(err);
          } catch (e) {}
        } finally {
          try {
            reader.releaseLock();
          } catch (e) {}
        }
      },
      cancel(reason) {
        // no special handling
      },
    });

    // Small debug: log start snippet (trimmed)
    console.log(nowTag(), "Starting proxy stream for prompt:", prompt.slice(0, 120));

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    console.error("Stream route fatal error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error", detail: err?.message || String(err) }, { status: 500 });
  }
}
