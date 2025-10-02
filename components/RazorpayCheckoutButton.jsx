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

      // Create order via API route
      const res = await axios.post("/api/razorpay/create-order", { planId: plan });
      const { ok, order } = res.data;
      if (!ok) throw new Error("Order creation failed");

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_1234567890";

      const isYearly = order?.notes?.plan === "pro-yearly";

      const options = {
        key,
        amount: order.amount,
        currency: "INR",
        name: "SynapseWrite",
        description: isYearly ? "SynapseWrite Pro — Yearly" : "SynapseWrite Pro — Monthly",
        order_id: order.id,
        handler: function (response) {
          alert(
            "Payment success (mock/test). Razorpay Payment ID: " +
              (response?.razorpay_payment_id || "test_payment")
          );
          // TODO: Activate subscription in backend
        },
        prefill: { name: "", email: "", contact: "" },
        notes: order.notes || {},
        theme: { color: "#111827" }
      };

      if (!window.Razorpay) throw new Error("Raz
