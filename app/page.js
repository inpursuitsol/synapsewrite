// app/page.js
'use client';
import React, { useState, useRef, useMemo } from 'react';

/**
 * SynapseWrite — Improved UI + Full SEO Scoring
 *
 * Drop-in replacement for app/page.js. Keeps streaming SSE behavior,
 * adds an SEO scoring engine and polished UI.
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
          // SSE buffering and parsing
          bufferRef.current += chunk;
          const parts = bufferRef.current.split(/\r?\n\r?\n/);
          bufferRef.current = parts.pop() || '';
          for (const part of parts) {
            const lines = part.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const payload = line.replace(/^data:\s*/, '');
                if (payload === '[DONE]') {
                  // stream finished marker
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

      // flush leftover buffer
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
    setTitleOverride('');
    setMetaOverride('');
  }

  function handleCopy() {
    navigator.clipboard?.writeText(content);
  }

  // Derived metrics & SEO scoring
  const metrics = useMemo(() => computeFullSEO(content, titleOverride, metaOverride, prompt), [content, titleOverride, metaOverride, prompt]);

  // Helper that returns color for score
  function scoreColor(score) {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-400';
    return 'bg-red-500';
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">SynapseWrite</h1>
              <p className="mt-1 text-sm text-gray-600">Your AI writing co-pilot — charged with SEO-friendly articles.</p>
            </div>
            <div className="text-right text-xs text-gray-500">Beta</div>
          </div>
        </header>

        <form onSubmit={handleGenerate} className="mb-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-9 flex gap-3">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Top phones in India 2025 — 500-800 word buyer's guide (include key features, pricing guidance)"
              className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={streaming}
              className="bg-blue-600 text-white px-5 py-3 rounded-md font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {streaming ? 'Generating…' : 'Generate'}
            </button>
          </div>

          <div className="lg:col-span-3 flex gap-2">
            <button type="button" onClick={handleCancel} disabled={!streaming} className="w-full bg-white border border-gray-200 px-4 py-3 rounded-md text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleClear} className="w-full bg-white border border-gray-200 px-4 py-3 rounded-md text-sm">
              Clear
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Article column */}
          <section className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow p-8 min-h-[520px]">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <input
                    value={titleOverride}
                    onChange={(e) => setTitleOverride(e.target.value)}
                    placeholder="Edit title (optional)"
                    className="w-full text-2xl font-semibold border-0 focus:ring-0 placeholder:text-gray-400"
                  />
                  <input
                    value={metaOverride}
                    onChange={(e) => setMetaOverride(e.target.value)}
                    placeholder="Meta description (optional)"
                    className="w-full text-sm border-0 focus:ring-0 placeholder:text-gray-400"
                  />
                </div>

                <div className="ml-4 text-right">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="text-sm font-medium">{status || 'Idle'}</div>
                </div>
              </div>

              <hr className="my-4" />

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
                <button
                  type="button"
                  onClick={() => {
                    // quick "Ask model for meta" helper — append instruction to prompt and re-run
                    setPrompt(p => `${p}\n\nAlso generate a concise meta description (150-160 chars) and a 6-10 word SEO title.`)
                  }}
                  className="ml-auto px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-100"
                >
                  Ask for Meta
                </button>
              </div>
            </div>
          </section>

          {/* SEO Sidebar */}
          <aside className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow p-6" style={{ minWidth: 260 }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">SEO Score</div>
                  <div className="text-2xl font-bold">{metrics.score}</div>
                </div>
                <div className="w-40">
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full ${scoreColor(metrics.score)}`} style={{ width: `${metrics.score}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{metrics.grade}</div>
                </div>
              </div>

              <hr className="my-4" />

              <div className="text-sm text-gray-600">Key metrics</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Words</div>
                  <div className="font-medium">{metrics.words}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Read time</div>
                  <div className="font-medium">{metrics.readingMinutes} min</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Flesch</div>
                  <div className="font-medium">{metrics.flesch}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">H1 / H2s</div>
                  <div className="font-medium">{metrics.h1Present ? 'H1 ✓' : 'No H1'} / {metrics.h2Count} H2</div>
                </div>
              </div>

              <hr className="my-4" />

              <div className="text-sm text-gray-600">Top suggestions</div>
              <ol className="list-decimal pl-5 mt-2 text-sm">
                {metrics.suggestions.slice(0, 5).map((s, i) => (
                  <li key={i} className={`mb-2 ${s.important ? 'font-medium' : 'text-gray-700'}`}>{s.text}</li>
                ))}
              </ol>

              <hr className="my-4" />

              <div className="text-sm text-gray-600 mb-2">Top keywords</div>
              <ul className="list-disc pl-5 text-sm">
                {metrics.topKeywords.slice(0, 8).map((k, idx) => (
                  <li key={idx}>{k.word} — {k.count} ({k.pct}%)</li>
                ))}
              </ul>

              <hr className="my-4" />

              <div className="text-xs text-gray-500">
                Preview: <span className="font-medium">{metrics.snippetTitle || '(no title)'}</span>
                <div className="mt-2 text-sm text-gray-700">{metrics.snippetMeta || 'Meta will appear here (150-160 chars recommended).'}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ------------------ ArticlePreview (simple markdown renderer) ------------------ */
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
    const hMatch = t.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      flushParagraph();
      flushList();
      const level = hMatch[1].length;
      nodes.push({ type: 'h' + level, text: hMatch[2].trim() });
      continue;
    }
    const bullet = t.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      if (!listBuffer) listBuffer = [];
      listBuffer.push(bullet[1].trim());
      continue;
    }
    const num = t.match(/^\d+\.\s+(.*)$/);
    if (num) {
      if (!listBuffer) listBuffer = [];
      listBuffer.push(num[1].trim());
      continue;
    }
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

/* ------------------ SEO scoring & helpers ------------------ */
function computeFullSEO(text, titleOverride, metaOverride, prompt) {
  const clean = (text || '').replace(/\r?\n/g, '\n').trim();
  const wordsArr = clean ? clean.split(/\s+/) : [];
  const words = wordsArr.length;
  const readingMinutes = Math.max(1, Math.round((words / 200) * 10) / 10);

  const sentences = clean ? (clean.split(/[.!?]+/).filter(s => s.trim()).length || 1) : 1;
  const syllables = wordsArr.reduce((acc, w) => acc + estimateSyllables(w), 0);
  const fleschRaw = words ? 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words) : 0;
  const flesch = Math.max(0, Math.round(fleschRaw));

  // headings detection
  const h1Match = clean.match(/^#\s+(.+)/m);
  const h1Present = !!(titleOverride?.trim() || h1Match);
  const h2Matches = [...(clean.matchAll(/^\s*#{2}\s+(.+)/gm) || [])];
  const h2Count = h2Matches.length;

  // top keywords
  const stopwords = new Set(['the','and','a','an','in','on','of','for','to','is','with','it','this','that','these','those','as','are','be','by','from','at','or','was','will','has','have','its','their','they','them','but','if','we','you','your']);
  const freq = {};
  for (const w of wordsArr) {
    const cleaned = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleaned || stopwords.has(cleaned) || cleaned.length < 2) continue;
    freq[cleaned] = (freq[cleaned] || 0) + 1;
  }
  const totalKeywords = Object.values(freq).reduce((a,b)=>a+b,0) || 1;
  const topKeywords = Object.entries(freq)
    .map(([word, count]) => ({ word, count, pct: Math.round((count/totalKeywords)*1000)/10 }))
    .sort((a,b)=>b.count - a.count);

  // title & meta (overrides take priority)
  const derivedTitle = (titleOverride && titleOverride.trim()) || (h1Match && h1Match[1]) || '';
  const derivedMeta = (metaOverride && metaOverride.trim()) || extractFirstNChars(clean.replace(/^#[^\n]*\n/, ''), 160);

  // keyword-target checks: pick likely target (first top keyword)
  const targetKeyword = topKeywords[0] ? topKeywords[0].word : (prompt ? prompt.split(/\s+/)[0].toLowerCase() : null);
  const keywordChecks = {
    inTitle: derivedTitle.toLowerCase().includes(targetKeyword || '') && !!targetKeyword,
    inIntro: clean.slice(0, 200).toLowerCase().includes(targetKeyword || ''),
    inH2: h2Matches.some(m => (m[1] || '').toLowerCase().includes(targetKeyword || '')),
    inConclusion: lastNWords(clean, 50).toLowerCase().includes(targetKeyword || '')
  };

  // links count (naive)
  const links = (clean.match(/https?:\/\/[^\s)]+/g) || []).length;

  // score components
  let score = 0;
  // title length (ideal 50-60 chars)
  const tlen = derivedTitle.length;
  if (tlen === 0) score += 0;
  else if (tlen >= 50 && tlen <= 60) score += 10;
  else if (tlen >= 40 && tlen < 50) score += 7;
  else if (tlen > 60 && tlen <= 80) score += 6;
  else score += 3;

  // meta length (150-160 ideal)
  const mlen = derivedMeta.length;
  if (mlen >= 145 && mlen <= 165) score += 10;
  else if (mlen >= 120 && mlen < 145) score += 7;
  else if (mlen > 165 && mlen <= 220) score += 5;
  else score += 2;

  // H1 presence (10)
  score += h1Present ? 10 : 0;

  // H2 coverage (10)
  score += Math.min(10, h2Count * 2); // up to 5 H2s -> 10 points

  // Keyword usage (25)
  let kwScore = 0;
  kwScore += keywordChecks.inTitle ? 7 : 0;
  kwScore += keywordChecks.inIntro ? 6 : 0;
  kwScore += keywordChecks.inH2 ? 6 : 0;
  kwScore += keywordChecks.inConclusion ? 6 : 0;
  score += kwScore;

  // Readability (10) -> scale flesch 0-100 to 0-10
  const fleschScore = Math.max(0, Math.min(100, flesch));
  score += Math.round((fleschScore / 100) * 10);

  // Length (10) -> prefer 600-1200 words
  if (words >= 600 && words <= 1200) score += 10;
  else if (words >= 400 && words < 600) score += 7;
  else if (words > 1200) score += 6;
  else score += Math.max(0, Math.round((words / 400) * 5)); // small credit for short content

  // Links (5)
  score += Math.min(5, links);

  // Final clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Grade
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  // Suggestions (prioritized)
  const suggestions = [];
  if (!derivedTitle) suggestions.push({ text: 'Add an H1 or fill the Title field (use the primary keyword).', important: true });
  if (tlen < 50) suggestions.push({ text: 'Make the title longer (50–60 characters recommended).', important: true });
  if (mlen < 140) suggestions.push({ text: 'Add a meta description (150–160 chars) that includes the primary keyword.', important: true });
  if (!keywordChecks.inTitle) suggestions.push({ text: `Include the target keyword "${targetKeyword}" in the title.`, important: true });
  if (!keywordChecks.inIntro) suggestions.push({ text: 'Mention the target keyword early in the intro (first 20–40 words).', important: false });
  if (h2Count < 2) suggestions.push({ text: 'Add more H2 subheadings to improve scannability.', important: false });
  if (words < 500) suggestions.push({ text: 'Increase article length to at least 600 words for better SEO.', important: false });
  if (links === 0) suggestions.push({ text: 'Add 1–3 relevant external or internal links.', important: false });
  if (flesch < 50) suggestions.push({ text: 'Shorten long sentences and use transition words to improve readability.', important: false });

  // snippet preview (title + meta)
  const snippetTitle = derivedTitle || (topKeywords[0] ? capitalizeFirst(`${topKeywords[0].word} — ${prompt.split(' ').slice(0,4).join(' ')}`) : '');
  const snippetMeta = derivedMeta || (clean.slice(0, 155) + (clean.length > 155 ? '…' : ''));

  return {
    words,
    readingMinutes,
    flesch: Math.round(flesch),
    h1Present,
    h2Count,
    topKeywords,
    score,
    grade,
    suggestions,
    snippetTitle,
    snippetMeta,
    wordsArr,
    topKeywords: topKeywords,
    links,
  };
}

function extractFirstNChars(text, n) {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n).trim() + (t.length > n ? '…' : '');
}

function capitalizeFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lastNWords(text, n) {
  const arr = text.trim().split(/\s+/);
  return arr.slice(-n).join(' ');
}

/* -------------------- utilities -------------------- */
function estimateSyllables(word) {
  const w = (word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const vs = w.match(/[aeiouy]+/g);
  let count = vs ? vs.length : 0;
  if (w.endsWith('e')) {
    if (!(w.endsWith('le') && w.length > 2)) count = Math.max(1, count - 1);
  }
  if (count === 0) count = 1;
  return count;
}
