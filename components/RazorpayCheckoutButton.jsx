// components/RazorpayCheckoutButton.jsx
"use client";
import { useCallback } from "react";

export default function RazorpayCheckoutButton({ amountINR, planName }) {
  const onClick = useCallback(async () => {
    // 1️⃣ Ask our backend to create a Razorpay Order
    const resp = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountINR }),
    });

    let data;
    try {
      data = await resp.json();
    } catch {
      data = {};
    }
    const { order, error } = data || {};

    if (!resp.ok || error || !order?.id) {
      alert(error || "Could not create order");
      return;
    }

    // 2️⃣ Open Razorpay popup
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "SynapseWrite",
      description: planName || "Subscription",
      order_id: order.id,
      handler: function (response) {
        alert("✅ Payment success (test mode). Thank you!");
        console.log("Razorpay response:", response);
      },
      theme: { color: "#0b69ff" },
    };

    if (!window.Razorpay) {
      alert("⚠️ Razorpay script not loaded yet. Refresh and try again.");
      return;
    }

    const rzp = new window.Razorpay(options);
    rzp.open();
  }, [amountINR, planName]);

  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg border border-black/10 shadow hover:shadow-md transition bg-white font-medium"
      aria-label={`Pay ₹${amountINR} for ${planName || "plan"}`}
    >
      Pay ₹{amountINR}
    </button>
  );
}
