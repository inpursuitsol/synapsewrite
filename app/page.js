"use client";
import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setOutput("");
    setLoading(true);

    const res = await fetch("/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.body) {
      setOutput("No response body");
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split("\n").filter((line) => line.startsWith("data:"));
      for (const line of lines) {
        const payload = line.replace("data: ", "").trim();
        if (payload === "[DONE]") {
          setLoading(false);
          return;
        }
        try {
          const data = JSON.parse(payload);
          if (data.text) {
            setOutput((prev) => prev + data.text);
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
  }

  return (
    <main className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">SynapseWrite Demo</h1>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          className="border p-2 flex-1"
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>
      <div className="border p-4 rounded min-h-[150px] whitespace-pre-wrap">
        {output || (loading ? "Waiting for response..." : "Output will appear here.")}
      </div>
    </main>
  );
}
