export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Simple SerpAPI fetch
async function fetchSerpEvidence(query, opts = {}) {
  const API_KEY = process.env.SERPAPI_KEY;
  if (!API_KEY) return null;
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&gl=IN&hl=en&num=6&api_key=${API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j.organic_results)) return null;

    const results = j.organic_results.map(r => ({
      title: r.title,
      snippet: r.snippet,
      link: r.link
    })).slice(0, 5);

    const summary = results.map(r => r.snippet).filter(Boolean).join('\n\n');
    return { summary, confidence: 80, sources: results.map(r => r.link) };
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').toString().trim();
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    let evidence = null;
    if (process.env.SERPAPI_KEY) {
      evidence = await fetchSerpEvidence(prompt);
    }

    const systemMessage = {
      role: 'system',
      content:
        'You are a professional content writer. ' +
        'ALWAYS output a polished, natural article (Markdown OK). ' +
        'Do NOT output raw JSON or API objects except the SEO JSON block at the top. ' +
        'Structure: short compelling title + 2–4 sentence introduction + well-structured paragraphs + conclusion. ' +
        'Avoid inline numbered lists or bullet dumps unless explicitly requested. ' +
        'Only use facts from EVIDENCE if provided. If confidence <60, add a warning note. ' +
        'Target 500–800 words. Keep tone neutral and clear.\n\n' +
        (evidence
          ? `EVIDENCE (confidence ${evidence.confidence}%):\n${evidence.summary}\n\nSources:\n${evidence.sources.join('\n')}`
          : 'No live evidence available — rely on general knowledge, but do not invent specifics.')
    };

    const messages = [systemMessage, { role: 'user', content: prompt }];

    const openaiRes = await fetch(OPENAI_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 900,
        stream: true
      })
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      return NextResponse.json({ error: 'OpenAI API error', detail: text }, { status: 500 });
    }

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
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: err.message }, { status: 500 });
  }
}
