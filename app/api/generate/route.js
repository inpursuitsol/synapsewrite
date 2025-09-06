// app/api/generate/route.js
import OpenAI from "openai";

export async function POST(req) {
  const { topic } = await req.json();

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Helper for non-stream fallback
  async function nonStreamResponse() {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful content generator." },
          { role: "user", content: `Write a detailed blog article about: ${topic}` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const content = completion?.choices?.[0]?.message?.content ?? completion?.choices?.[0]?.text ?? "";
      return new Response(JSON.stringify({ content }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  try {
    // Start a streaming completion. If the SDK supports stream:true, this returns an async iterable.
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful content generator." },
        { role: "user", content: `Write a detailed blog article about: ${topic}` }
      ],
      max_tokens: 2000,
      temperature: 0.7,
      stream: true,
    });

    // Create a ReadableStream that forwards token text chunks to the client as plain text
    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Try multiple shapes: delta.content (streaming chat), message.content, or text
            const textPiece =
              chunk?.choices?.[0]?.delta?.content ??
              chunk?.choices?.[0]?.message?.content ??
              chunk?.choices?.[0]?.text ??
              "";

            if (textPiece) {
              controller.enqueue(new TextEncoder().encode(textPiece));
            }
          }
          // Close when done
          controller.close();
        } catch (err) {
          // On error, close and let client fallback (or show partial)
          try {
            controller.enqueue(new TextEncoder().encode("\n\n[STREAM ERROR]\n"));
          } catch (e) {}
          controller.close();
        }
      },
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    // If streaming failed (SDK or network), fallback to a normal non-stream response
    console.error("Streaming failed, falling back to non-stream:", err);
    return await nonStreamResponse();
  }
}
