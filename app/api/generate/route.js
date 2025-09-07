// app/api/generate/route.js
import OpenAI from "openai";

/**
 * Streaming-enabled generate route with stricter "fact-check" prompt.
 * - Streams plain text to the client when possible.
 * - Falls back to returning JSON { content } if streaming isn't available.
 *
 * WARNING: make sure OPENAI_API_KEY is set in Vercel for Production & Preview environments.
 */

export async function POST(req) {
  try {
    const { topic } = await req.json();

    if (!topic || !String(topic).trim()) {
      return new Response(JSON.stringify({ error: "Missing 'topic' in request body." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Current date (help the model reason about recency)
    const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Strong system + user instructions to reduce hallucination and require sources
    const messages = [
      {
        role: "system",
        content:
          `You are a careful, factual article writer for a public blog.`
          + ` ALWAYS include a "Sources" section at the end listing URLs (or "No reliable sources found").`
          + ` For any product mentioned, include an explicit release month & year and the primary regions it's sold in.`
          + ` If you cannot verify a fact, write "I could not verify this" rather than inventing it.`
          + ` Output should be informative, neutral, and structured (summary, recommendations, Sources).`
          + ` The current date is ${now}. Use it when judging recency.`,
      },
      {
        role: "user",
        content:
          `Write a detailed, up-to-date blog article about: ${topic}\n\n` +
          `Requirements:\n` +
          `- Start with a 2-3 sentence summary.\n` +
          `- For each recommended product (e.g., phone) include: model name, release month & year, short pros/cons,`
          + ` and a one-line reason it's recommended for buyers in India.\n` +
          `- Include a "Sources" section at the end listing at least 1-3 URLs used to verify facts. If no reliable source found, write "No reliable sources found".\n` +
          `- If unsure about a fact, explicitly say "I could not verify this".\n` +
          `- Keep tone factual (temperature low).`,
      },
    ];

    // Helper fallback: non-stream final response (JSON)
    async function nonStreamResponse() {
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 2000,
          temperature: 0.1,
        });

        const content =
          completion?.choices?.[0]?.message?.content ??
          completion?.choices?.[0]?.text ??
          "";

        return new Response(JSON.stringify({ content }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("nonStreamResponse error:", err);
        return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Try streaming (preferred)
    try {
      const stream = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 2000,
        temperature: 0.1,
        stream: true,
      });

      // Stream plain text chunks to the client
      const body = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              // Attempt to extract text from multiple possible streaming shapes
              const textPiece =
                chunk?.choices?.[0]?.delta?.content ??
                chunk?.choices?.[0]?.message?.content ??
                chunk?.choices?.[0]?.text ??
                "";

              if (textPiece) {
                controller.enqueue(new TextEncoder().encode(textPiece));
              }
            }
            controller.close();
          } catch (err) {
            console.error("Stream error:", err);
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
      // Streaming not available or failed — fallback to non-stream JSON response
      console.warn("Streaming failed or not supported, falling back to non-stream:", err?.message ?? err);
      return await nonStreamResponse();
    }
  } catch (err) {
    console.error("Route error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
