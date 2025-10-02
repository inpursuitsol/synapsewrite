"use client";
import Script from "next/script";
import { useCallback } from "react";
import { getPlan } from "../lib/pricing";

export default function RazorpayCheckoutButton({ plan, label }) {
  const { name, amountPaise } = getPlan(plan);

  const handleClick = useCallback(async () => {
    // 1) Create an order on our server
    const res = await fetch("/api/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
    });

    const text = await res.text();
    if (!res.ok) {
      try { alert(JSON.parse(text)?.error || "Could not create order."); }
      catch { alert(text || "Could not create order."); }
      return;
    }

    const order = JSON.parse(text);
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) return alert("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");

    // 2) Open Razorpay with the order_id
    // eslint-disable-next-line no-undef
    const rzp = new window.Razorpay({
      key,
      order_id: order.id,
      name: "SynapseWrite",
      description: name,
      theme: { color: "#0f172a" },
      handler: () => (window.location.href = "/thank-you"),
    });

    rzp.on("payment.failed", () => alert("Payment Failed. Please try again."));
    rzp.open();
  }, [name, amountPaise]);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button onClick={handleClick} className="bg-black text-white px-5 py-3 rounded-xl">
        {label || `Subscribe — ${name}`}
      </button>
    </>
  );
}
