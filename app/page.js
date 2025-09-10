// app/page.js
'use client';
import React, { useState, useRef } from 'react';

export default function Page() {
  const [prompt, setPrompt] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const controllerRef = useRef(null);
  const bufferRef = useRef(''); // for SSE partial chunks

  // Start streaming; uses fetch + ReadableStream reader to parse SSE from server
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

    // Abort existing controller if any
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
          // accumulate chunk into buffer, then try to split SSE events
          bufferRef.current += chunk;
          const parts = bufferRef.current.split(/\r?\n\r?\n/);
          // leave last partial in bufferRef
          bufferRef.current = parts.pop() || '';
          for (const part of parts) {
            // each part may contain multiple lines, find lines starting with 'data:'
            const lines = part.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const payload = line.replace(/^data:\s*/, '');
                if (payload === '[DONE]') {
                  // stream finished
                } else {
                  // OpenAI streaming returns JSON objects per data line
                  try {
                    const obj = JSON.parse(payload);
                    // Extract text deltas from choices
                    const choices = obj.choices || [];
                    for (const ch of choices) {
                      const delta = ch.delta || {};
                      const text = delta.content || '';
                      if (text) {
                        setContent(prev => prev + text);
                      }
                    }
                  } catch (err) {
                    // Not JSON (maybe the server forwarded some text) -> append raw
                    setContent(prev => prev + payload);
                  }
                }
              } else {
                // sometimes the server may forward raw text chunks -> append
                setContent(prev => prev + line + '\n');
              }
            }
          }
        }
      }

      // After read loop finishes, flush any remaining buffer (it might have final content)
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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">SynapseWrite</h1>
          <p className="mt-1 text-sm text-gray-600">Enter any topic and press Generate — you'll get a full article (streamed).</p>
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
          <section className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 min-h-[360px]">
              <div className="prose max-w-none">
                {/* Title extraction: if first line looks like a markdown title, render it */}
                {content ? (
                  // Render markdown-like content simply as HTML paragraphs for now
                  <ArticlePreview markdown={content} />
                ) : (
                  <div className="text-gray-400">Generated article will appear here — streaming in real time.</div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-3">
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
          </section>

          <aside className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-3">Status</div>
            <div className="text-base font-medium mb-2">{status || 'Idle'}</div>
            <div className="text-sm text-gray-600">
              Words: <strong>{content.trim() ? content.trim().split(/\s+/).length : 0}</strong>
            </div>
            <div className="mt-4 text-sm text-gray-500">Tip: If you want machine-readable output, append "Return JSON" to the prompt.</div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// Simple renderer: converts basic markdown headings and paragraphs to HTML nodes
function ArticlePreview({ markdown }) {
  // Very small, safe markdown-like parser: split by lines and render headings/paragrahs.
  const lines = markdown.split(/\r?\n/);
  const nodes = [];
  let buffer = [];

  function flushBuffer() {
    if (buffer.length) {
      nodes.push({ type: 'p', text: buffer.join(' ').trim() });
      buffer = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) {
      flushBuffer();
      continue;
    }
    if (/^#{1,3}\s+/.test(ln)) {
      flushBuffer();
      const level = ln.match(/^#+/)[0].length;
      const text = ln.replace(/^#+\s*/, '');
      nodes.push({ type: 'h' + level, text });
      continue;
    }
    if (/^[-*]\s+/.test(ln)) {
      // treat as bullet: flush buffer and push li
      flushBuffer();
      nodes.push({ type: 'li', text: ln.replace(/^[-*]\s+/, '') });
      continue;
    }
    buffer.push(ln);
  }
  flushBuffer();

  return (
    <article className="prose lg:prose-xl">
      {nodes.map((n, idx) => {
        if (n.type === 'h1') return <h1 key={idx}>{n.text}</h1>;
        if (n.type === 'h2') return <h2 key={idx}>{n.text}</h2>;
        if (n.type === 'h3') return <h3 key={idx}>{n.text}</h3>;
        if (n.type === 'li') return <li key={idx}>{n.text}</li>;
        return <p key={idx}>{n.text}</p>;
      })}
    </article>
  );
}
