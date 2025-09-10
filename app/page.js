'use client';

export const dynamic = "force-dynamic";

import React, { useState, useRef, useMemo } from 'react';

/**
 * SynapseWrite — Streaming UI + Auto SEO JSON Parsing + SEO Scoring
 */

export default function Page() {
  const [prompt, setPrompt] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [metaOverride, setMetaOverride] = useState('');
  const controllerRef = useRef(null);
  const bufferRef = useRef('');

  // -------------------- Handle Generate --------------------
  async function handleGenerate(e) {
    e && e.preventDefault();
    if (!prompt.trim()) {
      setStatus('Please enter a topic or prompt.');
      return;
    }
    setContent('');
    setStatus('Generating…');
    setStreaming(true);
    bufferRef.current = '';

    if (controllerRef.current) {
      try { controllerRef.current.abort(); } catch (e) {}
    }
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: ctrl.signal
      });

      if (!res.ok) {
        const txt = await res.text();
        setStatus(`Server error: ${res.status}`);
        setStreaming(false);
        setContent(txt);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let seoCaptured = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          bufferRef.current += chunk;

          // Capture SEO JSON block if present
          if (!seoCaptured) {
            const startIdx = bufferRef.current.indexOf('<!--SEO_START');
            const endIdx = bufferRef.current.indexOf('SEO_END-->');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              const between = bufferRef.current.slice(startIdx, endIdx + 'SEO_END-->'.length);
              const firstBrace = between.indexOf('{');
              const lastBrace = between.lastIndexOf('}');
              if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                try {
                  const parsed = JSON.parse(between.slice(firstBrace, lastBrace + 1));
                  if (parsed.title) setTitleOverride(parsed.title);
                  if (parsed.meta) setMetaOverride(parsed.meta);
                } catch (e) {
                  console.warn('Failed parsing SEO JSON', e);
                }
              }
              bufferRef.current =
                bufferRef.current.slice(0, startIdx) +
                bufferRef.current.slice(endIdx + 'SEO_END-->'.length);
              seoCaptured = true;
            }
          }

          // SSE parsing
          const parts = bufferRef.current.split(/\r?\n\r?\n/);
          bufferRef.current = parts.pop() || '';
          for (const part of parts) {
            const lines = part.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const payload = line.replace(/^data:\s*/, '');
                if (payload !== '[DONE]') {
                  try {
                    const obj = JSON.parse(payload);
                    for (const ch of obj.choices || []) {
                      const text = ch.delta?.content || '';
                      if (text) setContent(prev => prev + text);
                    }
                  } catch {
                    setContent(prev => prev + payload);
                  }
                }
              } else {
                setContent(prev => prev + line + '\n');
              }
            }
          }
        }
      }

      // Flush leftovers (and SEO block if still there)
      if (bufferRef.current.trim()) {
        if (!seoCaptured) {
          const startIdx = bufferRef.current.indexOf('<!--SEO_START');
          const endIdx = bufferRef.current.indexOf('SEO_END-->');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const between = bufferRef.current.slice(startIdx, endIdx + 'SEO_END-->'.length);
            const firstBrace = between.indexOf('{');
            const lastBrace = between.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              try {
                const parsed = JSON.parse(between.slice(firstBrace, lastBrace + 1));
                if (parsed.title) setTitleOverride(parsed.title);
                if (parsed.meta) setMetaOverride(parsed.meta);
              } catch (e) {}
            }
            bufferRef.current =
              bufferRef.current.slice(0, startIdx) +
              bufferRef.current.slice(endIdx + 'SEO_END-->'.length);
            seoCaptured = true;
          }
        }
        setContent(prev => prev + bufferRef.current);
      }

      setStatus('Done');
    } catch (err) {
      setStatus(err.name === 'AbortError' ? 'Cancelled' : 'Error: ' + err.message);
    } finally {
      setStreaming(false);
      controllerRef.current = null;
    }
  }

  // -------------------- Controls --------------------
  function handleCancel() {
    if (controllerRef.current) controllerRef.current.abort();
    setStreaming(false);
    setStatus('Cancelled');
  }
  function handleClear() {
    setPrompt('');
    setContent('');
    setStatus('');
    setTitleOverride('');
    setMetaOverride('');
  }
  function handleCopy() {
    navigator.clipboard?.writeText(content);
  }

  // -------------------- SEO Metrics --------------------
  const metrics = useMemo(
    () => computeFullSEO(content, titleOverride, metaOverride, prompt),
    [content, titleOverride, metaOverride, prompt]
  );
  const scoreColor = (s) =>
    s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-yellow-400' : 'bg-red-500';

  // -------------------- Render --------------------
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold">SynapseWrite</h1>
          <p className="text-sm text-gray-600">
            Your AI writing co-pilot — SEO-friendly articles streamed in real time.
          </p>
        </header>

        <form onSubmit={handleGenerate} className="mb-6 flex gap-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Top phones in India 2025 — write a 500–800 word buyer’s guide"
            className="flex-1 rounded-md border px-4 py-3 text-lg shadow-sm focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={streaming}
            className="bg-blue-600 text-white px-5 py-3 rounded-md font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {streaming ? 'Generating…' : 'Generate'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={!streaming}
            className="bg-white border px-4 py-3 rounded-md text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="bg-white border px-4 py-3 rounded-md text-sm"
          >
            Clear
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Article */}
          <section className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow p-8 min-h-[520px]">
              <input
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
                placeholder="SEO title"
                className="w-full text-2xl font-semibold border-0 focus:ring-0 mb-2"
              />
              <input
                value={metaOverride}
                onChange={(e) => setMetaOverride(e.target.value)}
                placeholder="Meta description"
                className="w-full text-sm border-0 focus:ring-0 mb-4"
              />
              <div className="prose prose-lg lg:prose-xl max-w-none">
                {content ? (
                  <ArticlePreview markdown={content} />
                ) : (
                  <div className="text-gray-400">
                    Generated article will appear here — streaming live.
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleCopy} disabled={!content} className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm">
                  Copy
                </button>
                <a
                  href={`data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`}
                  download="article.md"
                  className={`px-4 py-2 rounded-md border text-sm ${content ? 'bg-white' : 'opacity-60 pointer-events-none'}`}
                >
                  Download .md
                </a>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-600">SEO Score</div>
                  <div className="text-2xl font-bold">{metrics.score}</div>
                </div>
                <div className="w-40">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${scoreColor(metrics.score)}`} style={{ width: `${metrics.score}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{metrics.grade}</div>
                </div>
              </div>

              <hr className="my-4" />
              <div className="text-sm text-gray-600 mb-2">Top Suggestions</div>
              <ul className="list-disc pl-5 text-sm">
                {metrics.suggestions.slice(0, 5).map((s, i) => (
                  <li key={i}>{s.text}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// -------------------- Markdown Preview --------------------
function ArticlePreview({ markdown }) {
  const lines = markdown.split(/\r?\n/);
  return (
    <article className="prose lg:prose-xl">
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </article>
  );
}

// -------------------- SEO Scoring --------------------
function computeFullSEO(text, titleOverride, metaOverride, prompt) {
  const clean = (text || '').trim();
  const wordsArr = clean ? clean.split(/\s+/) : [];
  const words = wordsArr.length;
  const readingMinutes = Math.max(1, Math.round((words / 200) * 10) / 10);

  const flesch = 60; // simplified for now
  const score = words > 600 ? 80 : words > 400 ? 65 : 40;
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Fair';
  const suggestions = [];
  if (!titleOverride) suggestions.push({ text: 'Add a title with the keyword' });
  if (!metaOverride) suggestions.push({ text: 'Add a meta description' });
  if (words < 600) suggestions.push({ text: 'Increase article length to at least 600 words' });

  return { score, grade, words, readingMinutes, flesch, suggestions };
}
