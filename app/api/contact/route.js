// app/contact/page.js
"use client";

import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
      setName(""); setEmail(""); setMessage("");
    } catch (err) {
      alert("Unable to send. Try support@synapsewrite.io");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "36px auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontFamily: "Poppins, Inter" }}>Contact sales / support</h1>
      {!done ? (
        <form onSubmit={onSubmit} style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <input placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} required style={{ padding: 12, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)" }} />
          <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required style={{ padding: 12, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)" }} />
          <textarea placeholder="Message" value={message} onChange={(e)=>setMessage(e.target.value)} rows={6} required style={{ padding: 12, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)" }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={sending} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white" }}>
              {sending ? "Sending…" : "Send message"}
            </button>
            <a href="mailto:support@synapsewrite.io" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", textDecoration: "none" }}>Email support</a>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 18, background: "white", padding: 16, borderRadius: 8 }}>Thanks — we received your message and will reply via email shortly.</div>
      )}
    </div>
  );
}
