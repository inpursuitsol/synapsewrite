"use client";

import { useState, useRef } from "react";

export default function StreamingPage() {
  const [prompt, setPrompt] = useState(
    "Write a 200-word helpful blog post on how early-stage startups can adopt AI quickly and ethically."
  );
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef(null);

  const handleGenerate = async () => {
    setOutput("");
    setStatus("Connecting…");
    setLoading(true);

    // Abort previous request if any
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const resp = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || "Write a short blog post on AI for startups.",
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        setStatus("Error");
        setOutput("Server error: " + (await resp.text()));
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        chunk
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .forEach((line) => {
            const data = line.replace(/^data:\s*/, "");
            if (data === "[DONE]") {
              setStatus("Finished");
              setLoading(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed?.text) {
                setOutput((o) => o + parsed.text);
              } else {
                // handle generic text fields or raw text events
                if (typeof parsed === "string") setOutput((o) => o + parsed);
              }
            } catch (e) {
              // not JSON — append raw text (safe fallback)
              setOutput((o) => o + data);
            }
          });
      }

      setStatus("Finished");
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("Canceled");
      } else {
        setOutput("Request failed: " + (err?.message || String(err)));
        setStatus("Error");
      }
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (controllerRef.current) controllerRef.current.abort();
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setStatus("Copied");
      setTimeout(() => setStatus(""), 1200);
    } catch {
      setStatus("Copy failed");
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-heading text-slate-900">
          SynapseWrite — Streaming Preview
        </h1>
        <p className="mt-2 text-slate-600">
          Real-time token streaming for faster feedback. Use this page to test
          and iterate before integrating into the main flows.
        </p>
      </header>

      <section className="bg-white shadow-sm rounded-lg p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="w-full border border-slate-200 rounded-md p-3 text-sm leading-6 resize-vertical focus:ring-2 focus:ring-indigo-300 focus:outline-none font-inter"
        />

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm transition ${
              loading ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loading ? "Generating…" : "Generate (Stream)"}
          </button>

          <button
            onClick={handleCancel}
            disabled={!loading}
            className="px-3 py-2 rounded-md border border-slate-200 text-sm text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={copyOutput}
            disabled={!output}
            className="ml-auto px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            Copy Output
          </button>

          <div className="ml-3 text-sm text-slate-500">{status}</div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Output</h3>
          <div
            className="min-h-[160px] bg-slate-50 border border-slate-100 rounded-md p-4 text-sm leading-7 font-mono text-slate-800 whitespace-pre-wrap"
            aria-live="polite"
          >
            {output || <span className="text-slate-400">No output yet — click Generate to start streaming.</span>}
          </div>
        </div>
      </section>

      <footer className="mt-6 text-xs text-slate-500">
        Tip: streaming gives a faster, more interactive feel. You can integrate this block into your editor or publish workflows.
      </footer>
    </main>
  );
}
