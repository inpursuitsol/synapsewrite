// components/RazorpayCheckoutButton.jsx
"use client";
import { useCallback } from "react";

export default function RazorpayCheckoutButton({ amountINR, planName }) {
  const onClick = useCallback(async () => {
    // 1) Create a Razorpay Order on our server
    const resp = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountINR }),
    });

    let data;
    try { data = await resp.json(); } catch { data = {}; }
    const { order, error } = data || {};
    if (!resp.ok || error || !order?.id) {
      alert(error || "Could not create order");
      return;
    }

    // 2) Open Razorpay Checkout popup
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "SynapseWrite",
      description: planName || "Subscription",
      order_id: order.id,

      // ✅ NEW: verify on the server after Razorpay says "success"
      handler: async function (response) {
        // response has: razorpay_payment_id, razorpay_order_id, razorpay_signature
        const r = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ razorpay_response: response }),
        });
        const v = await r.json();
        if (v.ok) {
          alert("✅ Payment verified. Thank you!");
        } else {
          alert(`⚠️ Verification failed: ${v.error || "unknown error"}`);
        }
      },

      theme: { color: "#0b69ff" },
    };

    if (!window.Razorpay) {
      alert("Razorpay script not loaded yet. Refresh and try again.");
      return;
    }

    const rzp = new window.Razorpay(options);

    // ✅ NEW: helpful error message if payment fails in the popup
    rzp.on("payment.failed", function (resp) {
      const err = resp?.error || {};
      console.error("Razorpay payment.failed", err);
      alert(`Payment failed: ${err.description || err.reason || err.code || "Unknown error"}`);
    });

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
