// app/api/razorpay/create-order/route.ts
import Razorpay from "razorpay";
import { NextResponse } from "next/server";

type CreateOrderBody = {
  planId: "pro-monthly" | "pro-yearly";
};

function inPaise(amountInRupees: number) {
  return Math.round(amountInRupees * 100);
}

export async function POST(req: Request) {
  try {
    const { planId } = (await req.json()) as CreateOrderBody;

    // Plan pricing (₹)
    const pricing = {
      "pro-monthly": { amount: 499, description: "SynapseWrite Pro — Monthly", notes: { plan: "pro-monthly" } },
      "pro-yearly": { amount: 3999, description: "SynapseWrite Pro — Yearly", notes: { plan: "pro-yearly" } }
    } as const;

    if (!planId || !(planId in pricing)) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

    const MOCK = String(process.env.RAZORPAY_MOCK).toLowerCase() === "true";

    // MOCK path: return a fake order usable for opening Checkout (no charge)
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

    // LIVE path: create a real order using Razorpay credentials
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
  } catch (err: any) {
    console.error("Razorpay create-order error", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
