"use client";
import Script from "next/script";
import { useCallback } from "react";

/**
 * Props supported:
 * - plan: "pro-monthly" | "pro-yearly"
 * - label: string (button text)
 * - amountPaise?: number (overrides plan amount)
 * - planName?: string (overrides mapped name)
 */
export default function RazorpayCheckoutButton({
  plan,
  label = "Subscribe",
  amountPaise,
  planName,
}) {
  // Map your plan ids to paise + display name
  const map = {
    "pro-monthly": { amountPaise: 49900, planName: "Pro Monthly — ₹499" },
    "pro-yearly":  { amountPaise: 399900, planName: "Pro Yearly — ₹3,999" },
  };

  const resolvedAmount = amountPaise ?? map[plan]?.amountPaise ?? 9900;
  const resolvedName   = planName ?? map[plan]?.planName ?? "Pro Plan";

  const handleClick = useCallback(async () => {
    // 1) Create order on our server
    const res = await fetch("/api/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: resolvedAmount, currency: "INR" }),
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

    // 2) Open Razorpay with order_id
    // eslint-disable-next-line no-undef
    const rzp = new window.Razorpay({
      key,
      order_id: order.id,
      name: "SynapseWrite",
      description: resolvedName,
      theme: { color: "#0f172a" },
      handler: () => (window.location.href = "/thank-you"),
    });

    rzp.on("payment.failed", () => alert("Payment Failed. Please try again."));
    rzp.open();
  }, [resolvedAmount, resolvedName]);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button onClick={handleClick} className="bg-black text-white px-5 py-3 rounded-xl">
        {label}
      </button>
    </>
  );
}
