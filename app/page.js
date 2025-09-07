"use client";

import { useEffect, useState } from "react";

/**
 * Simple Review Dashboard
 * - Fetches from GET /api/review
 * - Displays all pending reviews in a table
 */

export default function ReviewDashboard() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchReviews() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/review");
      if (!r.ok) throw new Error("Failed to load reviews");
      const j = await r.json();
      setReviews(j);
    } catch (e) {
      console.error("fetchReviews error", e);
      setError(e?.message || "Error loading reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <div style={{ maxWidth: "1000px", margin: "28px auto", padding: "0 20px", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>📝 Review Dashboard</h1>

      <button
        onClick={fetchReviews}
        style={{
          padding: "8px 14px",
          background: "#2563EB",
          color: "#fff",
          borderRadius: 8,
          border: "none",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        Refresh
      </button>

      {loading && <p>Loading reviews…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {reviews.length === 0 && !loading && <p>No pending reviews.</p>}

      {reviews.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Topic</th>
              <th style={thStyle}>Region</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Payload</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td style={tdStyle}>{r.id}</td>
                <td style={tdStyle}>{r.topic}</td>
                <td style={tdStyle}>{r.region}</td>
                <td style={tdStyle}>{r.reason}</td>
                <td style={tdStyle}>{new Date(r.time).toLocaleString()}</td>
                <td style={tdStyle}>
                  {r.payload ? (
                    <details>
                      <summary style={{ cursor: "pointer", color: "#2563EB" }}>View</summary>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f3f4f6", padding: 8, borderRadius: 6 }}>
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>No payload</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 600,
  fontSize: 14,
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 14,
};
