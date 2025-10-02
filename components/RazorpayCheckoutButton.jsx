"use client";

import Script from "next/script";
import { useCallback } from "react";
import { getPlan } from "../lib/pricing";

export default function RazorpayCheckoutButton({ plan, label }) {
  const { name, amountPaise } = getPlan(plan);

  const handleClick = useCallback(async () => {
    try {
      // 1️⃣ Create order on our server
      const res = await fetch("/api/checkout/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
      });

      const text = await res.text();
      if (!res.ok) {
        try {
          alert(JSON.parse(text)?.error || "Could not create order.");
        } catch {
          alert(text || "Could not create order.");
        }
        return;
      }

      const order = JSON.parse(text);
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        alert("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");
        return;
      }

      // 2️⃣ Open Razorpay popup
      // eslint-disable-next-line no-undef
      const rzp = new window.Razorpay({
        key,
        order_id: order.id,
        name: "SynapseWrite",
        description: name,
        theme: { color: "#0f172a" },

        // ✅ 3️⃣ Payment success handler (verify on server)
        handler: async (response) => {
          // response contains razorpay_order_id, razorpay_payment_id, razorpay_signature
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(response),
            });

            const data = await verifyRes.json();
            if (verifyRes.ok && data.ok) {
              window.location.href = "/thank-you";
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } catch (err) {
            alert("Could not verify payment. Please try again.");
          }
        },
      });

      // 4️⃣ Handle user cancellation or failure
      rzp.on("payment.failed", (res) => {
        console.error("Razorpay payment failed:", res?.error);
        alert("Payment Failed. Please try again.");
      });

      rzp.open();
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Could not start payment. Please try again.");
    }
  }, [name, amountPaise]);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        onClick={handleClick}
        className="bg-black text-white px-5 py-3 rounded-xl hover:opacity-90"
      >
        {label || `Subscribe — ${name}`}
      </button>
    </>
  );
}
