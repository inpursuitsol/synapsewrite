// app/signup/page.js
"use client";

import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Signup failed");
      setDone(true);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", paddingTop: 18 }}>
      <h1 style={{ fontSize: 28, margin: 0, fontFamily: "Poppins, Inter" }}>Create your SynapseWrite account</h1>
      <p style={{ color: "#6b7280", marginTop: 8 }}>Sign up to save drafts, export and manage a workspace.</p>

      {!done ? (
        <form onSubmit={onSubmit} style={{ marginTop: 18, background: "white", padding: 18, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ padding: 12, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)" }} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required style={{ padding: 12, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)" }} />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" style={{ padding: 12, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)" }} />

            {error && <div style={{ color: "crimson" }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button disabled={loading} style={{ padding: "10px 14px", borderRadius: 8, background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", border: "none", fontWeight: 700 }}>
                {loading ? "Creating…" : "Create account"}
              </button>
              <a href="/generate" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", textDecoration: "none", color: "#0f1724", display: "inline-flex", alignItems: "center" }}>Try demo</a>
            </div>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 18, background: "white", padding: 18, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
          <h3 style={{ margin: 0 }}>Thanks — we received your request</h3>
          <p style={{ color: "#374151" }}>This demo signup is stored (server-side demo). For production we'll connect to a database or identity provider.</p>
          <a href="/generate" style={{ padding: "10px 14px", borderRadius: 8, background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", textDecoration: "none", fontWeight: 700 }}>Go to editor</a>
        </div>
      )}
    </div>
  );
}
