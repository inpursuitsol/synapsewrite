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
    if (!prompt.trim()) return;

    setContent('');
    setStreaming(true);
    bufferRef.current = '';
    setTitleOverride('');
    setMetaOverride('');
    setEvidenceConfidence(null);
    setEvidenceSources([]);

    if (controllerRef.current) controllerRef.current.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: ctrl.signal
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let seoCaptured = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        bufferRef.current += chunk;

        // Capture SEO JSON block
        if (!seoCaptured) {
          const start = bufferRef.current.indexOf('<!--SEO_START');
          const end = bufferRef.current.indexOf('SEO_END-->');
          if (start !== -1 && end !== -1) {
            const block = bufferRef.current.slice(start, end);
            const jsonMatch = block.match(/{[\s\S]*}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.title) setTitleOverride(parsed.title);
                if (parsed.meta) setMetaOverride(parsed.meta);
                if (parsed.confidence) setEvidenceConfidence(parsed.confidence);
                if (parsed.sources) setEvidenceSources(parsed.sources);
              } catch {}
            }
            bufferRef.current = bufferRef.current.slice(0, start) + bufferRef.current.slice(end + 9);
            seoCaptured = true;
          }
        }

        // Process SSE lines
        const lines = bufferRef.current.split(/\r?\n/);
        bufferRef.current = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '');
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            for (const ch of obj.choices || []) {
              const text = ch.delta?.content;
              if (text) setContent(prev => prev + text);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStreaming(false);
      controllerRef.current = null;
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(content || '');
  }

  const metrics = useMemo(
    () => computeSEO(content, titleOverride, metaOverride, evidenceConfidence, evidenceSources),
    [content, titleOverride, metaOverride, evidenceConfidence, evidenceSources]
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-base">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
        {/* Main content */}
        <section className="lg:col-span-8 bg-white rounded-lg shadow p-8">
          <form onSubmit={handleGenerate} className="flex gap-2 mb-4">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter topic…"
              className="flex-1 border px-3 py-2 rounded"
            />
            <button className="bg-blue-600 text-white px-4 rounded" disabled={streaming}>
              {streaming ? 'Generating…' : 'Generate'}
            </button>
          </form>

          <input
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder="SEO Title"
            className="w-full text-2xl font-semibold mb-2 border-0 focus:ring-0"
          />
          <input
            value={metaOverride}
            onChange={(e) => setMetaOverride(e.target.value)}
            placeholder="Meta description"
            className="w-full text-sm mb-4 border-0 focus:ring-0"
          />

          <div className="prose prose-2xl lg:prose-3xl max-w-none prose-headings:mt-8 prose-headings:mb-6 prose-p:leading-loose prose-p:mb-7">
            {content ? <ArticlePreview markdown={content} /> : <p className="text-gray-400">Generated article will appear here…</p>}
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
        <aside className="lg:col-span-4 bg-white rounded-lg shadow p-6 text-sm">
          <div className="font-semibold mb-2">SEO Score: {metrics.score} ({metrics.grade})</div>
          <div>Confidence: {metrics.evidenceConfidence != null ? `${metrics.evidenceConfidence}%` : 'N/A'}</div>
          <div className="mt-2">Sources:</div>
          <ul className="list-disc pl-4">{metrics.evidenceSources.map((s,i)=><li key={i}><a href={s} className="text-blue-600 underline" target="_blank">{s}</a></li>)}</ul>
          <div className="mt-3">Suggestions:</div>
          <ul className="list-disc pl-4">{metrics.suggestions.map((s,i)=><li key={i}>{s}</li>)}</ul>
        </aside>
      </div>
    </main>
  );
}

function ArticlePreview({ markdown }) {
  return <article className="prose lg:prose-3xl">{markdown.split(/\n/).map((l,i)=><p key={i}>{l}</p>)}</article>;
}

function computeSEO(text, title, meta, evidenceConfidence, evidenceSources) {
  const words = (text||'').split(/\s+/).filter(Boolean).length;
  const score = words > 600 ? 80 : words > 400 ? 65 : 40;
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Fair';
  const suggestions=[];
  if(!title) suggestions.push('Add SEO title');
  if(!meta) suggestions.push('Add meta description');
  if(words<600) suggestions.push('Increase article length');
  if(evidenceConfidence!=null && evidenceConfidence<60) suggestions.push('Evidence confidence is low');
  return {score,grade,suggestions,evidenceConfidence,evidenceSources};
}
