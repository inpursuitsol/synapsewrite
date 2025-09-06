"use client";
import { useState } from "react";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handles calling the API and updating UI
  async function generateArticle(topic) {
    // Track event in Plausible
    if (typeof window !== "undefined" && window.plausible) {
      window.plausible("Generate Article");
    }

    try {
      setError(null);
      setLoading(true);
      setResult("");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        let errText = "Something went wrong. Please try again.";
        try {
          const j = await res.json();
          if (j?.error) errText = j.error;
        } catch (e) {}
        throw new Error(errText);
      }

      const data = await res.json();
      if (!data?.content) {
        throw new Error("No content returned from the server. Try again.");
      }

      setResult(data.content);
    } catch (err) {
      const msg = err?.message ?? "Unknown error. Try again.";
      setError(msg);
      console.error("Generate error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📝 SynapseWrite</h1>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic..."
          style={{
            padding: "0.5rem",
            fontSize: "1rem",
            width: "300px",
            marginRight: "0.5rem",
          }}
        />
        <button
          onClick={() => generateArticle(topic)}
          disabled={loading || !topic.trim()}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Article"}
        </button>
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>⚠️ {error}</div>
      )}

      {result && (
        <div
          style={{
            whiteSpace: "pre-wrap",
            border: "1px solid #ddd",
            padding: "1rem",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          {result}
        </div>
      )}
    </main>
  );
}
