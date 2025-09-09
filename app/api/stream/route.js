// app/api/stream/route.js
import { NextResponse } from "next/server";

/**
 * Next.js Route Handler that proxies to OpenAI's streaming ChatCompletion
 * and forwards incremental content to the client as SSE-like chunks.
 *
 * Notes:
 * - Set OPENAI_API_KEY in Vercel / local env.
 * - This uses fetch + ReadableStream; works in Node 18+ / Next.js runtime.
 */

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = body?.prompt || "Write a short 300-word article about AI for startups";

    // Build request to OpenAI Chat Completions (streaming)
    const openAiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // change if you want another model
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
        stream: true
      }),
    });

    if (!openAiResp.ok) {
      const text = await openAiResp.text();
      return NextResponse.json({ error: "OpenAI error", detail: text }, { status: 502 });
    }

    // Create a ReadableStream that reads from the OpenAI stream and forwards to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openAiResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // OpenAI streaming SSE chunks are like: "data: {json}\n\n"
          // Split on double newline to process events
          const parts = buffer.split("\n\n");
          // Keep the last (possibly partial) part in buffer
          buffer = parts.pop();

          for (const part of parts) {
            const line = part.trim();
            if (!line) continue;
            // Each line may start with 'data:'
            const m = line.match(/^data:\s*(.*)$/s);
            if (!m) continue;
            const payload = m[1];

            if (payload === "[DONE]") {
              // Signal finish to client
              controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(payload);
              // for ChatCompletion streaming: parsed.choices[0].delta.content
              const token = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.delta?.text || "";
              if (token) {
                // Send a minimal SSE data field with JSON text
                const out = JSON.stringify({ text: token });
                controller.enqueue(new TextEncoder().encode(`data: ${out}\n\n`));
              }
            } catch (e) {
              // If parsing fails, forward raw payload
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ raw: payload })}\n\n`));
            }
          }
        }

        // If buffer remains (final flush), attempt to parse
        if (buffer && buffer.trim()) {
          const m = buffer.match(/^data:\s*(.*)$/s);
          if (m && m[1] !== "[DONE]") {
            try {
              const parsed = JSON.parse(m[1]);
              const token = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.delta?.text || "";
              if (token) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: token })}\n\n`));
            } catch {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ raw: buffer })}\n\n`));
            }
          }
        }

        // Done
        controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });

    // Return streaming response with SSE headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("stream error:", err);
    return NextResponse.json({ error: "server_error", detail: String(err) }, { status: 500 });
  }
}
