"use client";

import React, { useState, useRef, useEffect } from "react";

/**
 * Client page (app/page.js)
 * - Robust SSE parser (buffers until "\n\n")
 * - Streamed output rendering with auto-scroll
 * - Copy to clipboard and download Markdown
 * - Small SEO helpers (word count, reading time, Flesch approximation)
 *
 * This is plain JS (no TypeScript). It uses Tailwind classes where present,
 * but it will function without Tailwind installed.
 */

function wordCount(text = "") {
  return (text.match(/\b\w+\b/g) || []).length;
}
function readingTimeMinutes(text = "") {
  const wpm = 200;
  return Math.max(0.1, Math.round((wordCount(text) / wpm) * 10) / 10);
}
function fleschReadingEase(text = "") {
  const words = wordCount(text);
  if (!words) return 0;
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const syllables = (text.match(/[aeiouy]{1,2}/gi) || []).length;
  const ASL = words / sentences;
  const ASW = syllables / words;
  const score = 206.835 - 1.015 * ASL - 84.6 * ASW;
  return Math.round(score);
}
function topKeywordDensity(text = "", topN = 5) {
  const tokens = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const freq = {};
  tokens.forEach((t) => (freq[t] = (freq[t] || 0) + 1));
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count, pct: Math.round((count / tokens.length) * 1000) / 10 }));
}

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ctrlRef = useRef(null);
  const bufferRef = useRef("");
  const outRef = useRef(null);

  useEffect(() => {
    try { outRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); } catch {}
  }, [output]);

  function reset() {
    setOutput("");
    setError("");
    setLoading(false);
    bufferRef.current = "";
    if (ctrlRef.current) {
      try { ctrlRef.current.abort(); } catch {}
      ctrlRef.current = null;
    }
  }

  async function handleSubmit(e) {
    e && e.preventDefault();
    reset();

    const trimmed = (prompt || "").trim();
    if (!trimmed) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const controller = new AbortController();
      ctrlRef.current = controller;

      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`Server error: ${text}`);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        bufferRef.current += chunk;

        // parse events separated by double newline
        let idx;
        while ((idx = bufferRef.current.indexOf("\n\n")) !== -1) {
          const event = bufferRef.current.slice(0, idx).trim();
          bufferRef.current = bufferRef.current.slice(idx + 2);

          const lines = event.split(/\n/).map(l => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.replace(/^data:\s*/, "");
            if (payload === "[DONE]") {
              setLoading(false);
              ctrlRef.current = null;
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                setOutput(prev => prev + parsed.text);
              } else if (parsed.raw) {
                setOutput(prev => prev + parsed.raw);
              }
            } catch {
              setOutput(prev => prev + payload);
            }
          }
        }
      }

      // flush leftover
      if (bufferRef.current.trim()) {
        setOutput(prev => prev + bufferRef.current.trim());
        bufferRef.current = "";
      }

      setLoading(false);
      ctrlRef.current = null;
    } catch (err) {
      if (err?.name === "AbortError") setError("Request cancelled.");
      else setError(String(err));
      setLoading(false);
      ctrlRef.current = null;
    }
  }

  function handleCancel() {
    if (ctrlRef.current) {
      try { ctrlRef.current.abort(); } catch {}
      ctrlRef.current = null;
    }
    setLoading(false);
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => alert("Copied to clipboard"),
      () => alert("Copy failed")
    );
  }

  function downloadMarkdown() {
    if (!output) return;
    const md = `# Generated by SynapseWrite\n\n${output}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synapsewrite.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const wc = wordCount(output);
  const timeMin = readingTimeMinutes(output);
  const flesch = fleschReadingEase(output);
  const keywords = topKeywordDensity(output, 5);

  return (
    <main className="max-w-4xl mx-auto p-6" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">SynapseWrite</h1>
        <div className="text-sm text-gray-500">Live streaming editor</div>
      </header>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt — e.g. 'Write 5 blog titles about AI writing tools'"
          className="flex-1 border rounded-md p-3 shadow-sm"
          disabled={loading}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md shadow" disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
        <button type="button" className="px-3 py-2 border rounded-md" onClick={handleCancel} disabled={!loading}>
          Cancel
        </button>
      </form>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm min-h-[220px]">
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{output || (loading ? "Waiting for stream..." : "Output will appear here.")}</div>
          <div ref={outRef} />
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={handleCopy} disabled={!output}>Copy</button>
            <button className="px-3 py-1 border rounded" onClick={downloadMarkdown} disabled={!output}>Download MD</button>
          </div>
        </section>

        <aside className="bg-gray-50 p-4 rounded-lg shadow-sm">
          <div className="font-semibold mb-2">Info</div>
          <div className="text-sm mb-2">Words: <strong>{wc}</strong></div>
          <div className="text-sm mb-2">Reading: <strong>{timeMin} min</strong></div>
          <div className="text-sm mb-4">Flesch score: <strong>{flesch}</strong></div>

          <div className="font-semibold mb-2">Top keywords</div>
          <div className="text-sm">
            {keywords.length ? keywords.map(k => (
              <div key={k.word} className="py-0.5">{k.word} — {k.count} ({k.pct}%)</div>
            )) : <div className="text-gray-500">No data yet</div>}
          </div>
        </aside>
      </div>
    </main>
  );
}
