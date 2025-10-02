// components/RazorpayCheckoutButton.jsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function RazorpayCheckoutButton({ plan, label }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Load Razorpay script
  useEffect(() => {
    const id = "razorpay-checkout-js";
    if (document.getElementById(id)) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => {
      console.log("✅ Razorpay script loaded");
      setReady(true);
    };
    s.onerror = () => {
      console.error("❌ Razorpay script failed to load");
      setReady(false);
    };
    document.body.appendChild(s);
  }, []);

  // ✅ Handle checkout click
  async function handleClick() {
    try {
      console.log("🟡 Subscribe clicked for plan:", plan);
      setLoading(true);

      // Create order
      const res = await axios.post("/api/razorpay/create-order", { planId: plan });
      console.log("🟢 API response:", res.data);
      const { ok, order } = res.data;
      if (!ok || !order) throw new Error("Order creation failed");

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_1234567890";

      // ✅ Mock payment success (no real charge)
      if (String(key).includes("test")) {
        console.log("✅ Mock payment successful, redirecting to Thank You page...");
        window.location.href = "/thank-you";
        return;
      }

      // ✅ Real Razorpay checkout (for live later)
      const options = {
        key,
        amount: order.amount,
        currency: "INR",
        name: "SynapseWrite",
        description:
          order.notes?.plan === "pro-yearly"
            ? "SynapseWrite Pro — Yearly"
            : "SynapseWrite Pro — Monthly",
        order_id: order.id,
        handler: function (response) {
          console.log("✅ Payment success:", response);
          window.location.href = "/thank-you";
        },
        prefill: { name: "", email: "", contact: "" },
        notes: order.notes || {},
        theme: { color: "#111827" },
      };

      if (!window.Razorpay) throw new Error("Razorpay script not ready");
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        console.error("❌ Payment failed:", resp);
        alert("Payment failed: " + (resp?.error?.description || "Unknown error"));
      });
      rzp.open();
    } catch (e) {
      console.error("🚨 Checkout error:", e);
      alert("Oops! Something went wrong.\n" + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!ready || loading}
      className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-white font-medium shadow hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Processing..." : label || "Subscribe with Razorpay"}
    </button>
  );
}
