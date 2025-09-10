export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function fetchSerpEvidence(query, opts = {}) {
  const API_KEY = process.env.SERPAPI_KEY;
  if (!API_KEY) return null;
  const num = opts.numResults || 6;
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&gl=IN&hl=en&num=${num}&api_key=${API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();

    const results = [];
    if (Array.isArray(j.organic_results)) {
      for (const it of j.organic_results.slice(0, num)) {
        results.push({
          title: it.title || '',
          snippet: (it.snippet || '').trim(),
          link: it.link || '',
          domain: (it.link || '').split('/')[2] || '',
        });
      }
    }
    if (j.knowledge_graph && j.knowledge_graph.description) {
      results.unshift({
        title: j.knowledge_graph.title || '',
        snippet: j.knowledge_graph.description,
        link: j.knowledge_graph.source || '',
        domain: (j.knowledge_graph.source || '').split('/')[2] || '',
      });
    }
    if (!results.length) return null;

    const highTrust = ['gsmarena.com','91mobiles.com','indiatoday.in','indianexpress.com','ndtv.com','theverge.com','techcrunch.com'];
    const lowTrust = ['forum','reddit','quora'];

    for (const rsl of results) {
      let score = 50;
      const d = (rsl.domain || '').toLowerCase();
      if (highTrust.some(h => d.includes(h))) score += 30;
      if (lowTrust.some(l => d.includes(l))) score -= 20;
      if (/\b202[0-9]\b/.test(rsl.snippet + ' ' + rsl.title)) score += 10;
      if ((rsl.snippet || '').length > 80) score += 5;
      rsl.score = Math.max(0, Math.min(100, score));
    }

    results.sort((a,b)=>b.score - a.score);
    const summaryPieces = results.slice(0,4).map(r => r.snippet || r.title).filter(Boolean);
    const sources = results.slice(0,5).map(r => r.link || r.domain);
    const confidence = Math.round(results.slice(0,3).reduce((s,x)=>s+x.score,0) / 3);

    return { summary: summaryPieces.join('\n\n'), confidence, sources };
  } catch (err) {
    console.error('Serp evidence error', err);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').toString().trim();
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const userAskedForJSON = /json|machine[- ]?readable/i.test(prompt);

    let evidence = null;
    if (!userAskedForJSON && process.env.SERPAPI_KEY) {
      evidence = await fetchSerpEvidence(prompt);
    }

    const systemMessage = userAskedForJSON
      ? {
          role: 'system',
          content: 'User requested strict JSON; output only valid JSON.'
        }
      : {
          role: 'system',
          content:
            'You are a precise content writer. Write a Markdown article. ' +
            'At the very start, output a JSON block wrapped in <!--SEO_START ... SEO_END--> with: "title", "meta", ' +
            '"confidence" (number), and "sources" (array). Example:\n\n' +
            '<!--SEO_START\n{"title":"...","meta":"...","confidence":85,"sources":["url1","url2"]}\nSEO_END-->\n\n' +
            (evidence
              ? `Use ONLY these facts. Confidence ${evidence.confidence}%. Sources:\n${evidence.sources.join('\n')}\n\nFacts:\n${evidence.summary}`
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
        temperature: 0.7,
        max_tokens: 900,
        stream: true
      })
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('OpenAI error', text);
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
    console.error('Route error', err);
    return NextResponse.json({ error: 'Server error', detail: err.message }, { status: 500 });
  }
}
