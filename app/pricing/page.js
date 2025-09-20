// app/pricing/page.js
"use client";

import { useState } from "react";

export default function PricingPage() {
  // Default exchange rate (1 USD = X INR) — editable by user if they want an up-to-date conversion.
  const [rate, setRate] = useState(83); // default 1 USD = 83 INR (adjustable)
  const [from, setFrom] = useState("INR"); // display base
  const plans = [
    { id: "starter", name: "Starter", inr: 0, bullets: ["Basic editor", "Export to Markdown", "Up to 5 users"] },
    { id: "pro", name: "Pro", inr: 1499, bullets: ["Streaming authoring", "SEO templates", "WordPress export", "Priority support"] },
    { id: "team", name: "Team", inr: 4999, bullets: ["Workspace & teams", "Multi-user management", "SAML/SSO (optional integration)"] },
  ];

  function convert(amount, fromCur, toCur) {
    if (fromCur === toCur) return amount;
    if (fromCur === "INR" && toCur === "USD") return (amount / rate).toFixed(2);
    if (fromCur === "USD" && toCur === "INR") return Math.round(amount * rate);
    return amount;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "20px auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "Poppins, Inter", fontSize: 28 }}>Pricing</h1>
          <div style={{ color: "#6b7280", marginTop: 8 }}>All prices shown in <strong>INR</strong> by default. Use the converter to check USD equivalents.</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ color: "#6b7280", fontSize: 13 }}>Exchange rate (1 USD = )</label>
          <input value={rate} onChange={(e) => setRate(Number(e.target.value) || 1)} style={{ width: 88, padding: 8, borderRadius: 8, border: "1px solid rgba(15,23,36,0.08)" }} />
          <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(15,23,36,0.08)" }}>
            <option value="INR">INR (default)</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 20 }}>
        {plans.map((p) => (
          <div key={p.id} style={{ background: "white", padding: 18, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Monthly</div>
              </div>
              <div style={{ textAlign: "right" }}>
                {from === "INR" ? (
                  <div style={{ fontSize: 20, fontWeight: 800 }}>₹{p.inr}</div>
                ) : (
                  <div style={{ fontSize: 20, fontWeight: 800 }}>${convert(p.inr, "INR", "USD")}</div>
                )}
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {from === "INR" ? `$${convert(p.inr, "INR", "USD")}` : `₹${convert(convert(p.inr, "INR", "USD"), "USD", "INR")}`}
                </div>
              </div>
            </div>

            <ul style={{ marginTop: 12, color: "#374151", lineHeight: 1.8 }}>
              {p.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <a href="/signup" style={{ flex: 1, textAlign: "center", padding: "10px 12px", borderRadius: 8, background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", textDecoration: "none", fontWeight: 700 }}>Create account</a>
              <a href="/contact" style={{ flex: 1, textAlign: "center", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", color: "#0f1724", textDecoration: "none" }}>Contact sales</a>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, color: "#6b7280", fontSize: 13 }}>
        <strong>Note</strong>: Exchange rate is provided for convenience and may be approximate. You can edit the rate above to reflect the current bank/card rate.
      </div>
    </div>
  );
}
