"use client";

import { useState } from "react";

export default function StreamingPage() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);

  const handleStream = async () => {
    setOutput("");
    setStatus("Connecting...");
    setLoading(true);

    try {
      const resp = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || "Write a 200-word blog post on how startups can adopt AI." }),
      });

      if (!resp.ok || !resp.body) {
        setStatus("Error");
        setOutput("Server error: " + (await resp.text()));
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

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
                setOutput((prev) => prev + parsed.text);
              }
            } catch {
              // ignore malformed lines
            }
          });
      }

      setStatus("Finished");
    } catch (err) {
      setOutput("Request failed: " + err.message);
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>⚡ Synapsewrite — Streaming Demo</h1>

      <textarea
        rows={4}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
      />

      <button
        onClick={handleStream}
        disabled={loading}
        style={{
          padding: "0.5rem 1rem",
          background: "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Generating..." : "Generate (Stream)"}
      </button>

      <p>Status: {status}</p>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f3f4f6", padding: "1rem", marginTop: "1rem" }}>
        {output}
      </pre>
    </div>
  );
}
