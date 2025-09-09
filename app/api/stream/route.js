import { NextResponse } from "next/server";
import OpenAI from "openai";

// Streaming API route for Synapsewrite
export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "missing_prompt" },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const stream = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful AI writing assistant." },
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    // Create a ReadableStream to forward chunks to the browser
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || "";
            if (token) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`)
              );
            }
          }
          // Signal stream is done
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Con
