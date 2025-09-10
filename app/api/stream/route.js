// app/api/stream/route.js
import { NextResponse } from 'next/server';

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function fetchSerpSummary(query) {
  const key = process.env.SERPAPI_KEY;
  if (!key) return null;
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&gl=IN&hl=en&num=5&api_key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    // Build a short summary from common SerpAPI fields (organic_results & knowledge_graph)
    const pieces = [];
    if (j.knowledge_graph && j.knowledge_graph.description) {
      pieces.push(`Knowledge: ${j.knowledge_graph.description}`);
    }
    if (Array.isArray(j.organic_results)) {
      for (let i = 0; i < Math.min(4, j.organic_results.length); i++) {
        const it = j.organic_results[i];
        const title = it.title || '';
        const snippet = it.snippet || it.snippet_highlighted_words || '';
        const src = it.displayed_link || it.link || '';
        pieces.push(`${i+1}. ${title}${snippet ? ' — ' + snippet : ''}${src ? ' ('+src+')' : ''}`);
      }
    }
    const summary = pieces.join('\n').slice(0, 3200); // cap length
    return summary || null;
  } catch (err) {
    console.error('SerpAPI error', err);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').toString().trim();
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    // Detect if user explicitly asked for JSON / machine-readable
    const userAskedForJSON = /json|machine[- ]?readable|strict schema|only provide/i.test(prompt);

    // Base system instruction: prefer prose unless JSON requested
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
            'Do NOT return JSON or only structured data unless the user explicitly asks for JSON or machine-readable output.'
        };

    // Try to fetch live search summary (only when not asking for JSON)
    let searchSummary = null;
    if (!userAskedForJSON && process.env.SERPAPI_KEY) {
      searchSummary = await fetchSerpSummary(prompt);
    }

    // Build messages: include an extra system-level context with live search results if present
    const messages = [systemMessage];
    if (searchSummary) {
      messages.push({
        role: 'system',
        content:
          'Up-to-date web search summary (use these facts to improve accuracy). ' +
          'Incorporate these into the article when relevant. Do NOT output the raw search results; synthesize them into the prose.\n\n' +
          searchSummary
      });
    }

    messages.push({ role: 'user', content: prompt });

    // Call OpenAI with streaming
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
        max_tokens: 900,
        stream: true
      })
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('OpenAI error', openaiRes.status, text);
      return NextResponse.json({ error: 'OpenAI API error', detail: text }, { status: 500 });
    }

    // Forward the streaming response as-is to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiRes.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
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
