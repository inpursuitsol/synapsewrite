// app/api/stream/route.js
import { NextResponse } from 'next/server';

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // or gpt-4o-mini if available

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').toString().trim();
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    // If user explicitly asks for JSON or machine-readable, we will allow JSON output.
    const userAskedForJSON = /json|machine[- ]?readable|strict schema|only provide/i.test(prompt);

    // Strong system instruction to produce human-friendly article unless user asked for JSON.
    const systemMessage = userAskedForJSON
      ? {
          role: 'system',
          content: 'You are a helpful assistant. The user requested machine-readable output; respond with valid JSON only.'
        }
      : {
          role: 'system',
          content:
            'You are a helpful, professional writer. By default, produce a clear, human-readable article in Markdown-style prose. ' +
            'Write a strong title, short introduction, 3-6 subheadings where appropriate, and a concise conclusion. ' +
            'Do NOT return JSON or only structured data unless the user explicitly asks for JSON or machine-readable output. ' +
            'Keep tone neutral and factual. Use up-to-date phrasing and avoid listing raw API objects.'
        };

    const messages = [
      systemMessage,
      { role: 'user', content: prompt }
    ];

    const openaiRes = await fetch(OPENAI_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 800,
        stream: true
      })
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('OpenAI error', openaiRes.status, text);
      return NextResponse.json({ error: 'OpenAI API error', detail: text }, { status: 500 });
    }

    // Forward the stream directly as an SSE stream. The OpenAI streaming payload uses "data: ..." chunks.
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiRes.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Pass through the binary chunk directly
            controller.enqueue(value);
          }
          controller.close();
        } catch (err) {
          console.error('Stream error', err);
          controller.error(err);
        } finally {
          try { reader.releaseLock(); } catch (e) {}
        }
      }
    });

    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    };

    return new Response(stream, { headers });
  } catch (err) {
    console.error('Route error', err);
    return NextResponse.json({ error: 'Server error', detail: err.message }, { status: 500 });
  }
}
