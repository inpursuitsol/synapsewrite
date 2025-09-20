// app/api/checkout/order/route.js
import { NextResponse } from "next/server";

const PLANS = {
  starter: { id: "starter", amountINR: 0, label: "Starter (Free)" },
  pro: { id: "pro", amountINR: 1499, label: "Pro" },
  team: { id: "team", amountINR: 4999, label: "Team" },
};

export async function POST(req) {
  try {
    const body = await req.json();
    const planId = body?.planId || "pro";
    const plan = PLANS[planId];
    if (!plan) return NextResponse.json({ error: "invalid plan" }, { status: 400 });

    if (plan.amountINR === 0) {
      // Free plan — return dummy response (no payment needed)
      return NextResponse.json({ order: { id: `free-${Date.now()}`, amount: 0, currency: "INR", planId } });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay keys not configured" }, { status: 500 });
    }

    const amountPaise = plan.amountINR * 100; // Razorpay expects paise
    const payload = {
      amount: amountPaise,
      currency: "INR",
      receipt: `receipt_${planId}_${Date.now()}`,
      notes: { plan: planId },
      payment_capture: 1,
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Razorpay order creation failed:", txt);
      return NextResponse.json({ error: "failed to create order" }, { status: 502 });
    }

    const order = await res.json();
    return NextResponse.json({ order });
  } catch (err) {
    console.error("checkout order error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
