// app/api/stream/route.js
import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST() {
  try {
    // Hardcoded prompt for debugging
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say 'Hello world' in two short sentences." },
    ];

    const openaiResp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 100,
        stream: true,
      }),
    });

    if (!openaiResp.ok) {
      const text = await openaiResp.text();
      return NextResponse.json(
        { error: "openai_error", detail: text },
        { status: 502 }
      );
    }

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
            const lines = chunk
              .replace(/\r/g, "")
              .split("\n")
              .filter(Boolean);

            for (const line of lines) {
              if (line.startsWith("data:")) {
                const payload = line.substring(5).trim();

                if (payload === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }

                try {
                  const json = JSON.parse(payload);
                  const token = json.choices[0]?.delta?.content || "";
                  if (token) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ text: token })}\n\n`
                      )
                    );
                  }
                } catch {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ raw: payload })}\n\n`
                    )
                  );
                }
              }
            }
          }
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
    return NextResponse.json(
      { error: "server_error", detail: String(err) },
      { status: 500 }
    );
  }
}
