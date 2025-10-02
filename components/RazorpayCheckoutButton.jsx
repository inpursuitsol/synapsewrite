// components/RazorpayCheckoutButton.jsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function RazorpayCheckoutButton({ plan, label }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load Razorpay Checkout script once
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
    s.onload = () => setReady(true);
    s.onerror = () => setReady(false);
    document.body.appendChild(s);
  }, []);

  async function handleClick() {
    try {
      setLoading(true);

      // 1) Ask our server to create a TEST order
      const res = await axios.post("/api/razorpay/create-order", { planId: plan });
      const { ok, order, error } = res.data;
      if (!ok || !order) throw new Error(error || "Order creation failed");

      // 2) Open Razorpay Test Checkout
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID; // test key id
      if (!key) throw new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID missing");

      const isYearly = order?.notes?.plan === "pro-yearly";

      const options = {
        key,
        amount: order.amount,          // paise
        currency: "INR",
        name: "SynapseWrite",
        description: isYearly ? "SynapseWrite Pro — Yearly" : "SynapseWrite Pro — Monthly",
        order_id: order.id,            // <<< required
        handler: function (response) {
          // Payment success in TEST mode
          // Later: verify on server via signature & mark user Pro.
          window.location.href = "/thank-you";
        },
        prefill: { name: "", email: "", contact: "" },
        notes: order.notes || {},
        theme: { color: "#111827" }
      };

      if (!window.Razorpay) throw new Error("Razorpay script not loaded");
      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (resp) {
        const msg = resp?.error?.description || "Payment Failed";
        alert("Oops! Something went wrong.\n" + msg);
        console.error("Razorpay payment.failed:", resp);
      });

      rzp.open();
    } catch (e) {
      console.error(e);
      alert("Oops! Something went wrong.\n" + (e?.message || "Unknown error"));
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
      {loading ? "Processing..." : (label || "Subscribe with Razorpay")}
    </button>
  );
}
