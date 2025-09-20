// app/pricing/page.js
"use client";

import { useEffect, useState } from "react";

const PLANS = [
  { id: "starter", name: "Starter", inr: 0, bullets: ["Basic editor", "Export to Markdown", "Up to 5 users"] },
  { id: "pro", name: "Pro", inr: 1499, bullets: ["Streaming authoring", "SEO templates", "WordPress export", "Priority support"] },
  { id: "team", name: "Team", inr: 4999, bullets: ["Workspace & teams", "Multi-user management", "SAML/SSO (optional)"] },
];

export default function PricingPage() {
  const [rate, setRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function loadRate() {
      try {
        const r = await fetch("/api/exchange");
        const j = await r.json();
        setRate(j.rate || 83);
      } catch {
        setRate(83);
      } finally {
        setLoadingRate(false);
      }
    }
    loadRate();
  }, []);

  useEffect(() => {
    // Load Razorpay script once (only on client)
    if (typeof window !== "undefined" && !document.getElementById("razorpay-js")) {
      const s = document.createElement("script");
      s.id = "razorpay-js";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  async function onBuy(plan) {
    if (plan.inr === 0) {
      // Free plan: route to signup
      window.location.href = "/signup";
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const json = await res.json();
      if (!json?.order) {
        alert("Unable to create payment. Contact support.");
        setProcessing(false);
        return;
      }
      const order = json.order;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || window.__RAZORPAY_KEY_ID || "", // fallback
        amount: order.amount,
        currency: order.currency || "INR",
        name: "SynapseWrite",
        description: plan.name + " plan",
        order_id: order.id,
        handler: function (response) {
          // You should verify payment on server via webhook (we have webhook route)
          alert("Payment successful. Razorpay payment id: " + response.razorpay_payment_id);
          window.location.href = "/generate";
        },
        prefill: { email: "" },
        theme: { color: "#0b69ff" },
      };

      // Wait until script loaded
      function openCheckout() {
        // eslint-disable-next-line no-undef
        const rzp = new window.Razorpay(options);
        rzp.open();
      }

      if (window.Razorpay) openCheckout();
      else {
        const checker = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checker);
            openCheckout();
          }
        }, 200);
      }
    } catch (err) {
      console.error("buy error", err);
      alert("Payment failed. Contact support.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "20px auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "Poppins, Inter", fontSize: 28 }}>Pricing</h1>
          <div style={{ color: "#6b7280", marginTop: 8 }}>All prices are shown in <strong>INR</strong> by default. Live conversion fetched for USD.</div>
        </div>

        <div style={{ color: "#6b7280", fontSize: 13 }}>
          {loadingRate ? "Fetching exchange rate..." : `1 USD ≈ ₹${rate}`}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 20 }}>
        {PLANS.map((p) => (
          <div key={p.id} style={{ background: "white", padding: 18, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Monthly</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>₹{p.inr}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{rate ? `$${(p.inr / rate).toFixed(2)}` : "—"}</div>
              </div>
            </div>

            <ul style={{ marginTop: 12, color: "#374151", lineHeight: 1.8 }}>
              {p.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button disabled={processing} onClick={() => onBuy(p)} style={{ flex: 1, textAlign: "center", padding: "10px 12px", borderRadius: 8, background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", border: "none", fontWeight: 700 }}>
                {p.inr === 0 ? "Get started" : "Buy"}
              </button>
              <a href="/contact" style={{ flex: 1, textAlign: "center", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", color: "#0f1724", textDecoration: "none" }}>Contact sales</a>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, color: "#6b7280", fontSize: 13 }}>
        <strong>Note</strong>: Exchange rate is fetched live and may vary slightly from the final card/bank rate at payment time.
      </div>
    </div>
  );
}
