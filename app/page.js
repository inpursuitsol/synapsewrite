// app/page.js
"use client";
import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateArticle() {
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();
      setResult(data.content);
    } catch (err) {
      console.error(err);
      setResult("Error generating content. Please try again.");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">📝 SynapseWrite</h1>
      <input
        type="text"
        placeholder="Enter a topic..."
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="border p-2 rounded w-80 mb-4"
      />
      <button
        onClick={generateArticle}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Article"}
      </button>

      <div className="mt-6 w-full max-w-2xl">
        {result && (
          <div className="p-4 bg-white rounded shadow">
            <h2 className="font-semibold mb-2">Result:</h2>
            <p className="whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </main>
  );
}
