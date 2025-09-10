// app/api/stream/route.js
import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = (body?.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
    }

    // Call OpenAI streaming chat completion
    const openaiResp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // stable streaming model
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
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

    // Stream response back as SSE-like "data: ..." chunks
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
                } catch (err) {
                  // forward raw line if not JSON
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
          console.
