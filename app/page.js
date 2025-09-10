'use client';
export const dynamic = "force-dynamic";

import React, { useState, useRef, useMemo } from 'react';

export default function Page() {
  const [prompt, setPrompt] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [metaOverride, setMetaOverride] = useState('');
  const [evidenceConfidence, setEvidenceConfidence] = useState(null);
  const [evidenceSources, setEvidenceSources] = useState([]);
  const controllerRef = useRef(null);
  const bufferRef = useRef('');

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!prompt.trim()) {
      return;
    }

    setContent('');
    setStreaming(true);
    bufferRef.current = '';
    setTitleOverride('');
    setMetaOverride('');
    setEvidenceConfidence(null);
    setEvidenceSources([]);

    if (controllerRef.current) {
      try { controllerRef.current.abort(); } catch {}
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
        setContent(`Error: ${res.status}\n\n${txt}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let seoCaptured = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        bufferRef.current += chunk;

        // 1) Try capture SEO block once
        if (!seoCaptured) {
          const startIdx = bufferRef.current.indexOf('<!--SEO_START');
          const endIdx = bufferRef.current.indexOf('SEO_END-->');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const between = bufferRef.current.slice(startIdx, endIdx + 'SEO_END-->'.length);
            // extract first JSON object inside the block
            const jsonMatch = between.match(/{[\s\S]*}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.title) setTitleOverride(parsed.title);
                if (parsed.meta) setMetaOverride(parsed.meta);
                if (typeof parsed.confidence !== 'undefined') setEvidenceConfidence(parsed.confidence);
                if (Array.isArray(parsed.sources)) setEvidenceSources(parsed.sources);
              } catch (err) {
                console.warn('SEO JSON parse failed', err);
              }
            }
            // remove the block from buffer so it doesn't leak into content
            bufferRef.current = bufferRef.current.slice(0, startIdx) + bufferRef.current.slice(endIdx + 'SEO_END-->'.length);
            seoCaptured = true;
          }
        }

        // 2) Process SSE lines: split by newline and handle lines starting with 'data:'
        const lines = bufferRef.current.split(/\r?\n/);
        // keep last partial line in bufferRef
        bufferRef.current = lines.pop() || '';
        for (const lineRaw of lines) {
          const line = lineRaw.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '');
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            const choices = obj.choices || [];
            for (const ch of choices) {
              const text = ch.delta?.content;
              if (text) {
                setContent(prev => prev + text);
              }
            }
          } catch {
            // ignore non-JSON data lines
          }
        }
      }

      // Flush any remaining buffer (may contain leftover SSE or plain text)
      if (bufferRef.current.trim()) {
        // try final SEO parse if not captured
        if (!seoCaptured) {
          const startIdx = bufferRef.current.indexOf('<!--SEO_START');
          const endIdx = bufferRef.current.indexOf('SEO_END-->');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const between = bufferRef.current.slice(startIdx, endIdx + 'SEO_END-->'.length);
            const jsonMatch = between.match(/{[\s\S]*}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.title) setTitleOverride(parsed.title);
                if (parsed.meta) setMetaOverride(parsed.meta);
                if (typeof parsed.confidence !== 'undefined') setEvidenceConfidence(parsed.confidence);
                if (Array.isArray(parsed.sources)) setEvidenceSources(parsed.sources);
              } catch {}
            }
            bufferRef.current = bufferRef.current.slice(0, startIdx) + bufferRef.current.slice(endIdx + 'SEO_END-->'.length);
            seoCaptured = true;
          }
        }
        // try to extract any delta.content JSONs in leftover buffer
        const leftoverLines = bufferRef.current.split(/\r?\n/);
        for (const l of leftoverLines) {
          const ln = l.trim();
          if (!ln.startsWith('data:')) {
            // ignore
            continue;
          }
          const payload = ln.replace(/^data:\s*/, '');
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            for (const ch of obj.choices || []) {
              const text = ch.delta?.content;
              if (text) setContent(prev => prev + text);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setContent(prev => prev + '\n\n[Generation cancelled]');
      } else {
        setContent(prev => prev + `\n\n[Error] ${err.message || String(err)}`);
        console.error(err);
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
  }

  function handleCopy() {
    navigator.clipboard?.writeText(content || '');
  }

  const metrics = useMemo(
    () => computeSEO(content, titleOverride, metaOverride, prompt, evidenceConfidence, evidenceSources),
    [content, titleOverride, metaOverride, prompt, evidenceConfidence, evidenceSources]
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
        {/* Main column */}
        <section className="lg:col-span-8 bg-white rounded-lg shadow p-6">
          <form onSubmit={handleGenerate} className="flex gap-2 mb-4">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter topic… (e.g. Top phones in India 2025)"
              className="flex-1 border px-3 py-2 rounded"
            />
            <button className="bg-blue-600 text-white px-4 rounded" disabled={streaming}>
              {streaming ? 'Generating…' : 'Generate'}
            </button>
            <button type="button" onClick={handleCancel} className="ml-2 bg-white border px-3 rounded" disabled={!streaming}>
              Cancel
            </button>
          </form>

          <input
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder="SEO Title"
            className="w-full text-xl font-semibold mb-2 border-0 focus:ring-0"
          />
          <input
            value={metaOverride}
            onChange={(e) => setMetaOverride(e.target.value)}
            placeholder="Meta description"
            className="w-full text-sm mb-4 border-0 focus:ring-0"
          />

          <div className="prose prose-xl lg:prose-2xl max-w-none prose-headings:mt-8 prose-headings:mb-4 prose-p:leading-relaxed prose-p:mb-6">
            {content ? <ArticlePreview markdown={content} /> : <p className="text-gray-400">Generated article will appear here — streaming live.</p>}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleCopy} className="px-3 py-1 bg-gray-800 text-white rounded" disabled={!content}>Copy</button>
            <a
              href={`data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`}
              download="article.md"
              className={`px-3 py-1 rounded border ${content ? 'bg-white' : 'opacity-60 pointer-events-none'}`}
            >
              Download .md
            </a>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-sm text-gray-600">SEO Score</div>
                <div className="text-2xl font-bold">{metrics.score}</div>
              </div>
              <div style={{ width: 140 }}>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`${metrics.score >= 80 ? 'bg-green-500' : metrics.score >= 60 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${metrics.score}%`, height: '100%' }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{metrics.grade}</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-2">Evidence confidence</div>
            <div className="text-sm mb-3">
              {evidenceConfidence != null ? `${evidenceConfidence}%` : 'No live evidence'}
            </div>

            <div className="text-sm text-gray-600 mb-2">Sources</div>
            <ul className="list-disc pl-5 text-xs mb-3">
              {(evidenceSources && evidenceSources.length) ? evidenceSources.map((s, i) => (
                <li key={i}><a className="text-blue-600 underline" href={s} target="_blank" rel="noreferrer">{s}</a></li>
              )) : <li className="text-gray-400">No sources</li>}
            </ul>

            <div className="text-sm text-gray-600 mb-2">Top suggestions</div>
            <ul className="list-disc pl-5 text-sm">
              {metrics.suggestions.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* -------------------- ArticlePreview (basic markdown-ish rendering) -------------------- */
function ArticlePreview({ markdown }) {
  const blocks = splitIntoBlocks(markdown);
  return (
    <article className="prose lg:prose-2xl">
      {blocks.map((b, i) => {
        if (b.type === 'h1') return <h1 key={i}>{b.text}</h1>;
        if (b.type === 'h2') return <h2 key={i}>{b.text}</h2>;
        if (b.type === 'ul') return <ul key={i}>{b.items.map((it, idx) => <li key={idx}>{it}</li>)}</ul>;
        return <p key={i}>{b.text}</p>;
      })}
    </article>
  );
}
function splitIntoBlocks(md) {
  const lines = (md || '').split(/\r?\n/);
  const blocks = [];
  let para = [];
  let list = null;
  for (let ln of lines) {
    const t = ln.trim();
    if (!t) {
      if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; }
      if (list) { blocks.push({ type: 'ul', items: list }); list = null; }
      continue;
    }
    const h1 = t.match(/^#\s+(.*)$/);
    const h2 = t.match(/^##\s+(.*)$/);
    const li = t.match(/^[-*]\s+(.*)$/);
    if (h1) { if (para.length) { blocks.push({ type:'p', text:para.join(' ') }); para=[];} if (list){blocks.push({type:'ul',items:list});list=null;} blocks.push({type:'h1', text:h1[1]}); continue; }
    if (h2) { if (para.length) { blocks.push({ type:'p', text:para.join(' ') }); para=[];} if (list){blocks.push({type:'ul',items:list});list=null;} blocks.push({type:'h2', text:h2[1]}); continue; }
    if (li) { if (!list) list = []; list.push(li[1]); continue; }
    para.push(t);
  }
  if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
  if (list) blocks.push({ type: 'ul', items: list });
  return blocks;
}

/* -------------------- Simple SEO scoring -------------------- */
function computeSEO(text, title, meta, prompt, evidenceConfidence, evidenceSources) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const words = clean ? clean.split(' ').filter(Boolean).length : 0;
  const score = words >= 700 ? 88 : words >= 500 ? 72 : words >= 300 ? 55 : 35;
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const suggestions = [];
  if (!title) suggestions.push('Add a concise SEO title (50–60 chars).');
  if (!meta) suggestions.push('Add a meta description (150–160 chars).');
  if (words < 600) suggestions.push('Increase article length to ≥600 words.');
  if (evidenceConfidence != null && evidenceConfidence < 60) suggestions.push('Search confidence is low — consider refreshing sources.');
  if (!evidenceSources || evidenceSources.length === 0) suggestions.push('Add 1–3 authoritative sources.');
  return {
    score,
    grade,
    suggestions,
    words,
    evidenceConfidence,
    evidenceSources: evidenceSources || []
  };
}
