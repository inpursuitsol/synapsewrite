// components/RazorpayCheckoutButton.tsx

"use client";

import { useEffect, useState } from "react";
import axios from "axios";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type Props = {
  plan: "pro-monthly" | "pro-yearly";
  label?: string;
};

export default function RazorpayCheckoutButton({ plan, label }: Props) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load Razorpay Checkout script
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
      const res = await axios.post("/api/razorpay/create-order", { plan });
      const { ok, order } = res.data;

      if (!ok) throw new Error("Order creation failed");

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_1234567890";

      const options = {
        key,
        amount: order.amount,
        currency: "INR",
        name: "SynapseWrite",
        description: order.notes?.plan === "pro-yearly" ? "SynapseWrite Pro — Yearly" : "SynapseWrite Pro — Monthly",
        order_id: order.id,
        handler: function (response: any) {
          // Payment success handler — for MOCK you’ll land here immediately
          alert("Payment success (mock/test). Razorpay ID: " + (response.razorpay_payment_id || "test_payment"));
          // TODO: call your backend to mark subscription active for user
        },
        prefill: {
          name: "",
          email: "",
          contact: ""
        },
        notes: order.notes || {},
        theme: { color: "#111827" }
      };

      if (!window.Razorpay) throw new Error("Razorpay script not ready");
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        alert("Payment failed: " + (resp.error?.description || "Unknown error"));
      });
      rzp.open();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Unable to open Razorpay");
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
      {loading ? "Processing..." : label ?? "Subscribe with Razorpay"}
    </button>
  );
}
