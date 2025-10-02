"use client";
import Script from "next/script";
import { useCallback } from "react";

export default function RazorpayCheckoutButton({ amountPaise = 9900, planName = "Pro Monthly" }) {
  const handleClick = useCallback(async () => {
    const res = await fetch("/api/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const data = JSON.parse(text);
        alert(data?.error || "Could not create order.");
      } catch {
        alert(text || "Could not create order.");
      }
      return;
    }

    const order = JSON.parse(text);
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) return alert("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");

    // eslint-disable-next-line no-undef
    const rzp = new window.Razorpay({
      key,
      order_id: order.id,
      name: "SynapseWrite",
      description: planName,
      theme: { color: "#0f172a" },
      handler: () => (window.location.href = "/thank-you"),
    });

    rzp.on("payment.failed", () => alert("Payment Failed. Please try again."));
    rzp.open();
  }, [amountPaise, planName]);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button onClick={handleClick} className="bg-black text-white px-4 py-2 rounded-lg">
        Subscribe
      </button>
    </>
  );
}
