// app/api/stream/route.js
import { NextResponse } from "next/server";

/**
 * Simple SSE -> plain-text proxy for OpenAI streaming responses.
 *
 * Accepts POST { prompt, maxTokens? } from the client.
 * Calls OpenAI (streaming) and forwards only the assistant text (delta.content)
 * to the client as plain text chunks (no "data: {...}" wrappers).
 *
 * Requirements:
 *   - Set process.env.OPENAI_API_KEY
 *
 * Notes:
 *   - This implementation is intentionally minimal and safe for small traffic.
 *   - For production, add rate-limiting, auth, logging, and retry behavior.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini-2024-07-18"; // adjust if you use another model

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || "";
    const maxTokens = body.maxTokens || 800;
    if (!prompt || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing prompt or OPENAI_API_KEY" }, { status: 400 });
    }

    // Build the OpenAI chat request. Keep temperature low for consistent prose.
    const openaiReqBody = {
      model: OPENAI_MODEL,
      // Messages: adjust system/instruction as per your pipeline.
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs a clean article followed by a final SEO JSON block. Do NOT output markdown fences or labels. Final block must be valid JSON." },
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

    if (!openaiRes.ok) {
      const errTxt = await openaiRes.text();
      return NextResponse.json({ error: "OpenAI error", detail: errTxt }, { status: 502 });
    }

    // We'll read OpenAI's SSE stream and forward only the assistant "content" text.
    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");

    // This ReadableStream is what we return to the client.
    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ""; // accumulate raw SSE text fragments
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Split by newline - incoming data from OpenAI is SSE lines that begin with "data: "
            const lines = buffer.split(/\r?\n/);
            // Keep the last partial line in buffer
            buffer = lines.pop();

            for (let line of lines) {
              line = line.trim();
              if (!line) continue;

              // OpenAI SSE lines are of the form: data: {...}
              if (!line.startsWith("data:")) continue;
              const payload = line.replace(/^data:\s*/, "");

              // End of stream marker
              if (payload === "[DONE]") {
                controller.close();
                return;
              }

              // Parse JSON - each chunk is a chat.completion.chunk
              let parsed;
              try {
                parsed = JSON.parse(payload);
              } catch (e) {
                // ignore lines we can't parse
                continue;
              }

              // Extract assistant delta content (if present)
              try {
                const choices = parsed.choices || [];
                if (choices.length > 0) {
                  const delta = choices[0].delta || {};
                  const text = delta.content || ""; // main streaming text
                  if (text) {
                    // enqueue plain text (no wrappers)
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                }
              } catch (e) {
                // ignore individual parsing errors
              }
            }
          }

          // If we exit loop normally, flush any leftover buffer lines
          if (buffer) {
            const leftover = buffer.trim();
            if (leftover && leftover.startsWith("data:")) {
              const payload = leftover.replace(/^data:\s*/, "");
              if (payload !== "[DONE]") {
                try {
                  const parsed = JSON.parse(payload);
                  const choices = parsed.choices || [];
                  if (choices.length > 0) {
                    const delta = choices[0].delta || {};
                    const text = delta.content || "";
                    if (text) controller.enqueue(new TextEncoder().encode(text));
                  }
                } catch (e) {
                  // ignore
                }
              }
            }
          }

          controller.close();
        } catch (error) {
          // If anything goes wrong, error the stream so the client sees a failure.
          try {
            controller.error(error);
          } catch (e) {
            /* ignore */
          }
        } finally {
          try {
            reader.releaseLock();
          } catch (e) {}
        }
      },
      cancel(reason) {
        // client cancelled - nothing special to do here
      },
    });

    // Return the stream with plain text content-type so client receives readable text chunks
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        // no-cache to avoid proxies holding streaming responses
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    console.error("Stream route error:", err);
    return NextResponse.json({ error: "Internal server error", detail: err.message }, { status: 500 });
  }
}
