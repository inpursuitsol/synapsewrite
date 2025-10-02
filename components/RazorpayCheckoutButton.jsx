"use client";
import Script from "next/script";
import { useCallback } from "react";

export default function RazorpayCheckoutButton({ amountPaise = 9900, planName = "Pro Monthly" }) {
  const handleClick = useCallback(async () => {
    // 1) Create an order on our server
    const res = await fetch("/api/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR" }), // e.g. 9900 = ₹99.00
    });

    if (!res.ok) {
      alert("Could not create order. Please try again.");
      return;
    }
    const order = await res.json(); // { id, amount, currency, ... }

    // 2) Open Razorpay Checkout with the order_id
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      alert("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");
      return;
    }

    const options = {
      key,
      order_id: order.id,                 // IMPORTANT: use server-created order
      name: "SynapseWrite",
      description: planName,
      // prefill: { email: "", contact: "" }, // optional
      theme: { color: "#0f172a" },
      handler: function () {
        // success
        window.location.href = "/thank-you";
      },
      modal: {
        ondismiss: function () {
          // user closed the modal
        },
      },
    };

    // eslint-disable-next-line no-undef
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function () {
      alert("Payment Failed. Please try again.");
    });
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
