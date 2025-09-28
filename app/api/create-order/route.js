// app/api/create-order/route.js
import { NextResponse } from "next/server";
export const runtime = "nodejs"; // enable Node APIs (Buffer)

export async function POST(req) {
  try {
    const { amountINR, receipt = `rcpt_${Date.now()}` } = await req.json();

    if (!amountINR || isNaN(Number(amountINR))) {
      return NextResponse.json({ error: "amountINR required (number)" }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return NextResponse.json({ error: "Razorpay env vars missing" }, { status: 500 });
    }

    // Call Razorpay REST API using Basic Auth (no SDK needed)
    const auth = Buffer.from(`${key_id}:${key_secret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(Number(amountINR) * 100), // convert ₹ → paise
        currency: "INR",
        receipt,
        payment_capture: 1,
      }),
    });

    if (!response.ok) {
      const msg = await response.text();
      console.error("Razorpay order error:", msg);
      return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
    }

    const order = await response.json();
    return NextResponse.json({ order });
  } catch (err) {
    console.error("create-order exception:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
