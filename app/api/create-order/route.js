// app/api/razorpay/create-order/route.js
import Razorpay from "razorpay";
import { NextResponse } from "next/server";

// Helper: rupees -> paise
function inPaise(amountInRupees) {
  return Math.round(Number(amountInRupees) * 100);
}

export async function POST(req) {
  try {
    const { planId } = await req.json();

    // Define your plans/pricing (₹)
    const pricing = {
      "pro-monthly": {
        amount: 499,
        description: "SynapseWrite Pro — Monthly",
        notes: { plan: "pro-monthly" }
      },
      "pro-yearly": {
        amount: 3999,
        description: "SynapseWrite Pro — Yearly",
        notes: { plan: "pro-yearly" }
      }
    };

    if (!planId || !pricing[planId]) {
      return NextResponse.json({ ok: false, error: "Invalid planId" }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error("Razorpay keys missing");
      return NextResponse.json({ ok: false, error: "Server keys missing" }, { status: 500 });
    }

    // Create Razorpay client (Test mode because keys are test keys)
    const instance = new Razorpay({ key_id, key_secret });

    // Create an order (amount must be in paise)
    const order = await instance.orders.create({
      amount: inPaise(pricing[planId].amount),
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
      notes: pricing[planId].notes
    });

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    return NextResponse.json({ ok: false, error: "Failed to create order" }, { status: 500 });
  }
}
