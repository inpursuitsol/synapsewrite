"use client";

import { useState, useRef, useEffect } from "react";

/**
 * app/page.js
 * - Robust SSE parsing (buffer until "\n\n")
 * - Improved UI and small SEO scoring functions
 */

function wordCount(text = "") {
  return (text.match(/\b\w+\b/g) || []).length;
}

function readingTimeMinutes(text = "") {
  const wpm = 200;
  return Math.max(0.1, Math.round((wordCount(text) / wpm) * 10) / 10);
}

// Very small Flesch reading ease approximation
function fleschReadingEase(text = "") {
  const words = wordCount(text);
  if (!words) return 0;
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const syllables = (text.match(/[aeiouy]{1,2}/gi) || []).length; // rough
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
  const arr = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count, pct: Math.round((count / tokens.length) * 1000) / 10 }));
  return arr;
}

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);
  const bufferRef = useRef(""); // for robust SSE parsing
  const outRef = useRef(null);

  useEffect(() => {
    // auto-scroll when output updates
    try { outRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); } catch {}
  }, [output]);

  function resetState() {
    setOutput("");
    setError("");
    setLoading(false);
    bufferRef.current = "";
    if (controllerRef.current) {
      try { controllerRef.current.abort(); } catch {}
      controllerRef.current = null;
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    resetState();

    const trimmed = (prompt || "").trim();
    if (!trimmed) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const controller = new AbortController();
      controllerRef.current = controller;

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

        // Buffering technique:
        bufferRef.current += chunk;
        // process full SSE events separated by double newline "\n\n"
        let boundaryIndex;
        while ((boundaryIndex = bufferRef.current.indexOf("\n\n")) !== -1) {
          const event = bufferRef.current.slice(0, boundaryIndex).trim(); // single event content
          bufferRef.current = bufferRef.current.slice(boundaryIndex + 2); // remove processed event

          // each event may contain multiple lines like "data: {...}\n"
          const lines = event.split(/\n/).map((l) => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.replace(/^data:\s*/, "");
            if (payload === "[DONE]") {
              setLoading(false);
              controllerRef.current = null;
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                setOutput((prev) => prev + parsed.text);
              } else if (parsed.raw) {
                // raw debugging payload
                setOutput((prev) => prev + parsed.raw);
              } else {
                // some responses may contain full chunk objects (metadata). ignore.
              }
            } catch {
              // not JSON — append raw
              setOutput((prev) => prev + payload);
            }
          }
        }
      }

      // flush any remaining buffer (rare)
      if (bufferRef.current) {
        const leftover = bufferRef.current.trim();
        if (leftover) {
          setOutput((prev) => prev + leftover);
        }
        bufferRef.current = "";
      }

      setLoading(false);
      controllerRef.current = null;
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Request cancelled.");
      } else {
        setError(String(err));
      }
      setLoading(false);
      controllerRef.current = null;
    }
  }

  function handleCancel() {
    if (controllerRef.current) {
      try { controllerRef.current.abort(); } catch {}
      controllerRef.current = null;
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
    <main style={{ maxWidth: 1000, margin: "2rem auto", padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 26, marginBottom: 12 }}>SynapseWrite</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt (e.g., 'Write a 150-word intro about electric cars')"
          style={{ flex: 1, padding: 12, border: "1px solid #e6e6e6", borderRadius: 8 }}
          disabled={loading}
        />
        <button type="submit" style={{ padding: "10px 14px", borderRadius: 8, background: "#0b72ff", color: "white", border: "none" }} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
        <button type="button" onClick={handleCancel} style={{ padding: "10px 12px", borderRadius: 8 }} disabled={!loading}>
          Cancel
        </button>
      </form>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }}>
        <div style={{ border: "1px solid #eee", padding: 16, borderRadius: 10, minHeight: 180, background: "#fff", whiteSpace: "pre-wrap", overflowY: "auto" }}>
          <div style={{ fontSize: 15, lineHeight: 1.6 }}>{output || (loading ? "Waiting for stream..." : "Output will appear here.")}</div>
          <div ref={outRef} />
          {loading && <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>● streaming…</div>}
        </div>

        <aside style={{ border: "1px solid #f0f0f0", padding: 12, borderRadius: 10, background: "#fafafa" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>SEO & Info</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Words: <strong>{wc}</strong></div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Reading time: <strong>{timeMin} min</strong></div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Flesch score: <strong>{flesch}</strong></div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Top keywords</div>
            <ul style={{ paddingLeft: 16, marginTop: 6 }}>
              {keywords.length ? keywords.map(k => (
                <li key={k.word} style={{ fontSize: 13 }}>{k.word} — {k.count} ({k.pct}%)</li>
              )) : <li style={{ fontSize: 13, color: "#777" }}>No data yet</li>}
            </ul>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={handleCopy} disabled={!output} style={{ padding: "8px 10px", borderRadius: 8 }}>Copy</button>
            <button onClick={downloadMarkdown} disabled={!output} style={{ padding: "8px 10px", borderRadius: 8 }}>Download MD</button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Tip: try prompts like <code>List 5 blog ideas about AI writing</code>.
          </div>
        </aside>
      </div>
    </main>
  );
}
