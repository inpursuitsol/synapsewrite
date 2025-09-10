// app/page.js
'use client';
import React, { useState, useRef } from 'react';

export default function Page() {
  const [prompt, setPrompt] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const controllerRef = useRef(null);
  const bufferRef = useRef('');

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
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          bufferRef.current += chunk;
          const parts = bufferRef.current.split(/\r?\n\r?\n/);
          bufferRef.current = parts.pop() || '';
          for (const part of parts) {
            const lines = part.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const payload = line.replace(/^data:\s*/, '');
                if (payload === '[DONE]') {
                  // end marker
                } else {
                  try {
                    const obj = JSON.parse(payload);
                    const choices = obj.choices || [];
                    for (const ch of choices) {
                      const delta = ch.delta || {};
                      const text = delta.content || '';
                      if (text) setContent(prev => prev + text);
                    }
                  } catch (err) {
                    // Not JSON — append raw
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

      // Flush leftover buffer
      if (bufferRef.current.trim()) {
        try {
          const leftover = bufferRef.current.trim();
          if (leftover.startsWith('data:')) {
            const payload = leftover.replace(/^data:\s*/, '');
            if (payload !== '[DONE]') {
              const obj = JSON.parse(payload);
              const choices = obj.choices || [];
              for (const ch of choices) {
                const delta = ch.delta || {};
                const text = delta.content || '';
                if (text) setContent(prev => prev + text);
              }
            }
          } else {
            setContent(prev => prev + leftover);
          }
        } catch (e) {
          setContent(prev => prev + bufferRef.current);
        }
      }

      setStatus('Done');
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus('Generation cancelled.');
      } else {
        setStatus('Error: ' + (err.message || String(err)));
      }
    } finally {
      setStreaming(false);
      controllerRef.current = null;
    }
  }

  function handleCancel() {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setStreaming(false);
    setStatus('Cancelled');
  }

  function handleClear() {
    setPrompt('');
    setContent('');
    setStatus('');
  }

  function handleCopy() {
    navigator.clipboard?.writeText(content);
  }

  // Analytics helpers
  const metrics = computeMetrics(content);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">SynapseWrite</h1>
          <p className="mt-1 text-sm text-gray-600">Your AI writing co-pilot — polished articles in seconds.</p>
        </header>

        <form onSubmit={handleGenerate} className="mb-6 flex gap-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Top phones in India 2025 — write a 400-600 word buyer's guide"
            className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
            className="bg-white border border-gray-200 px-4 py-3 rounded-md text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="bg-white border border-gray-200 px-4 py-3 rounded-md text-sm"
          >
            Clear
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main article */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-8 min-h-[420px]">
              <div className="prose prose-lg lg:prose-xl max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-p:leading-relaxed prose-p:mb-5">
                {content ? <ArticlePreview markdown={content} /> : <div className="text-gray-400">Generated article will appear here — streaming in real time.</div>}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleCopy} disabled={!content} className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm">
                  Copy
                </button>
                <a
                  href={`data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`}
                  download="article.md"
                  className={`px-4 py-2 rounded-md border border-gray-200 text-sm ${content ? 'bg-white' : 'opacity-60 pointer-events-none'}`}
                >
                  Download .md
                </a>
              </div>
            </div>
          </section>

          {/* Sidebar: SEO / metrics */}
          <aside className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-3">Info</div>
            <div className="text-lg font-medium mb-2">{metrics.words} words</div>
            <div className="text-sm text-gray-600 mb-1">Reading: <strong>{metrics.readingMinutes} min</strong></div>
            <div className="text-sm text-gray-600 mb-3">Flesch score: <strong>{metrics.flesch}</strong></div>

            <div className="text-sm font-medium mt-4 mb-2">Top keywords</div>
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {metrics.topKeywords.slice(0, 8).map((k, idx) => (
                <li key={idx}>{k.word} — {k.count} ({k.pct}%)</li>
              ))}
            </ul>

            <div className="mt-4 text-xs text-gray-500">
              Tip: append "Return JSON" to the prompt if you want machine-readable output.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ---------- Article preview: small markdown-like renderer ---------- */
function ArticlePreview({ markdown }) {
  const lines = markdown.split(/\r?\n/);
  const nodes = [];
  let buffer = [];
  let listBuffer = null;

  function flushParagraph() {
    if (buffer.length) {
      nodes.push({ type: 'p', text: buffer.join(' ').trim() });
      buffer = [];
    }
  }
  function flushList() {
    if (listBuffer && listBuffer.length) {
      nodes.push({ type: 'ul', items: listBuffer.slice() });
      listBuffer = null;
    }
  }

  for (let ln of lines) {
    const t = ln.trim();
    if (!t) {
      flushParagraph();
      flushList();
      continue;
    }
    // headings
    const hMatch = t.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      flushParagraph();
      flushList();
      const level = hMatch[1].length;
      nodes.push({ type: 'h' + level, text: hMatch[2].trim() });
      continue;
    }
    // bullet
    const bullet = t.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      if (!listBuffer) listBuffer = [];
      listBuffer.push(bullet[1].trim());
      continue;
    }
    // numbered list
    const num = t.match(/^\d+\.\s+(.*)$/);
    if (num) {
      if (!listBuffer) listBuffer = [];
      listBuffer.push(num[1].trim());
      continue;
    }
    // normal paragraph line
    buffer.push(t);
  }
  flushParagraph();
  flushList();

  return (
    <article className="prose lg:prose-xl">
      {nodes.map((n, i) => {
        if (n.type === 'h1') return <h1 key={i}>{n.text}</h1>;
        if (n.type === 'h2') return <h2 key={i}>{n.text}</h2>;
        if (n.type === 'h3') return <h3 key={i}>{n.text}</h3>;
        if (n.type === 'ul') return <ul key={i}>{n.items.map((it, idx) => <li key={idx}>{it}</li>)}</ul>;
        return <p key={i}>{n.text}</p>;
      })}
    </article>
  );
}

/* ---------- Metrics: words, reading time, flesch, top keywords ---------- */
function computeMetrics(text) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { words: 0, readingMinutes: 0, flesch: 0, topKeywords: [] };

  const wordsArr = clean.split(/\s+/);
  const words = wordsArr.length;
  const readingMinutes = Math.max(1, Math.round((words / 200) * 10) / 10); // 200 wpm baseline

  // Sentences: split on .!? (naive)
  const sentences = clean.split(/[.!?]+/).filter(s => s.trim()).length || 1;

  // Syllable estimation (very rough): count vowel groups
  const syllables = wordsArr.reduce((acc, w) => acc + estimateSyllables(w), 0);

  // Flesch Reading Ease (approx)
  const fleschRaw = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  const flesch = Math.max(0, Math.round(fleschRaw));

  // Top keywords (simple frequency excluding stopwords)
  const stopwords = new Set([
    'the','and','a','an','in','on','of','for','to','is','with','it','this','that','these','those',
    'as','are','be','by','from','at','or','was','will','has','have','its','their','they','them','but','if','we','you','your'
  ]);
  const freq = {};
  for (const w of wordsArr) {
    const cleaned = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleaned || stopwords.has(cleaned) || cleaned.length < 2) continue;
    freq[cleaned] = (freq[cleaned] || 0) + 1;
  }
  const total = Object.values(freq).reduce((a,b)=>a+b,0) || 1;
  const topKeywords = Object.entries(freq)
    .map(([word, count]) => ({ word, count, pct: Math.round((count/total)*1000)/10 }))
    .sort((a,b)=>b.count - a.count);

  return { words, readingMinutes, flesch, topKeywords };
}

function estimateSyllables(word) {
  // Super-simple heuristic: count vowel groups; adjust common endings
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const vowels = w.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 0;
  // subtract silent e
  if (w.endsWith('e')) {
    if (!(w.endsWith('le') && w.length > 2)) count = Math.max(1, count - 1);
  }
  // common small words
  if (count === 0) count = 1;
  return count;
}
