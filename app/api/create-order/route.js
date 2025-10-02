// app/api/razorpay/create-order/route.js
import Razorpay from "razorpay";
import { NextResponse } from "next/server";

function inPaise(amountInRupees) {
  return Math.round(amountInRupees * 100);
}

export async function POST(req) {
  try {
    const { planId } = await req.json();

    const pricing = {
      "pro-monthly": { amount: 499, notes: { plan: "pro-monthly" }, description: "SynapseWrite Pro — Monthly" },
      "pro-yearly": { amount: 3999, notes: { plan: "pro-yearly" }, description: "SynapseWrite Pro — Yearly" }
    };

    if (!planId || !pricing[planId]) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

    const MOCK = String(process.env.RAZORPAY_MOCK || "").toLowerCase() === "true";

    if (MOCK) {
      const amount = inPaise(pricing[planId].amount);
      const fakeOrder = {
        id: "order_MOCK_" + Math.random().toString(36).slice(2),
        amount,
        currency: "INR",
        receipt: "rcpt_" + Date.now(),
        notes: pricing[planId].notes
      };
      return NextResponse.json({ ok: true, order: fakeOrder });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return NextResponse.json({ error: "Razorpay keys missing" }, { status: 500 });
    }

    const instance = new Razorpay({ key_id, key_secret });

    const order = await instance.orders.create({
      amount: inPaise(pricing[planId].amount),
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
      notes: pricing[planId].notes
    });

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error("Razorpay create-order error", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
