// components/RazorpayCheckoutButton.jsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function RazorpayCheckoutButton({ plan, label }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load Razorpay script once
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

  // Handle subscribe click
  async function handleClick() {
    try {
      console.log("🟡 Subscribe clicked for plan:", plan);
      setLoading(true);

      // Always mock for now — skip real API
      console.log("💡 Mock mode enabled — skipping Razorpay API");
      await new Promise((r) => setTimeout(r, 1000)); // fake delay
      console.log("✅ Mock payment successful. Redirecting to Thank You page...");
      window.location.href = "/thank-you";
      return;

      // (Below code will be activated when we switch to real Razorpay)
      /*
      const res = await axios.post("/api/razorpay/create-order", { planId: plan });
      const { ok, order } = res.data;
      if (!ok || !order) throw new Error("Order creation failed");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "SynapseWrite",
        description: "SynapseWrite Pro Subscription",
        order_id: order.id,
        handler: function (response) {
          console.log("✅ Payment success:", response);
          window.location.href = "/thank-you";
        },
        prefill: { name: "", email: "", contact: "" },
        notes: order.notes || {},
        theme: { color: "#111827" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        console.error("❌ Payment failed:", resp);
        alert("Payment failed: " + (resp?.error?.description || "Unknown error"));
      });
      rzp.open();
      */
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
