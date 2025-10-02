"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

function useRazorpayScript() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Razorpay) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);
  return ready;
}

export default function RazorpayCheckoutButton({
  planName,
  amountInPaise,
  customerEmail,
  customerName,
  className,
}) {
  const router = useRouter();
  const ready = useRazorpayScript();
  const [loading, setLoading] = useState(false);

  const handlePay = useCallback(async () => {
    try {
      setLoading(true);

      // 1) Create order on server
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          notes: { plan: planName },
        }),
      });
      if (!orderRes.ok) throw new Error("Failed to create order");
      const order = await orderRes.json(); // { id, amount, currency }

      // 2) Open Razorpay Checkout
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: "SynapseWrite Pro",
        description: planName,
        order_id: order.id,
        prefill: { email: customerEmail, name: customerName },
        theme: { color: "#000000" },
        handler: async (resp) => {
          try {
            // 3) Verify on server
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok || verify?.valid !== true) throw new Error("Verification failed");

            // 4) Redirect to Thank You
            const prettyAmount = `₹${(order.amount / 100).toFixed(2)} ${order.currency}`;
            const params = new URLSearchParams({
              status: "success",
              amount: prettyAmount,
              order_id: order.id,
              email: customerEmail || "",
            });
            router.push(`/thanks?${params.toString()}`);
          } catch (e) {
            console.error(e);
            alert("Payment verified, but redirect failed. Please check your subscription page.");
          }
        },
        modal: { ondismiss: () => setLoading(false), escape: true, confirm_close: true },
        retry: { enabled: true, max_count: 1 },
      });

      rzp.on("payment.failed", (resp) => {
        console.error("Payment failed", resp?.error);
        alert(resp?.error?.description || "Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Something went wrong while starting the payment. Please try again.");
      setLoading(false);
    }
  }, [amountInPaise, planName, customerEmail, customerName, router]);

  return (
    <button
      disabled={!ready || loading}
      onClick={handlePay}
      className={className || "px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"}
    >
      {loading ? "Processing…" : "Subscribe with Razorpay"}
    </button>
  );
}
