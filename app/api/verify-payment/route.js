// app/api/verify-payment/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = body?.razorpay_response || {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { ok: false, error: "Missing razorpay fields" },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Server missing RAZORPAY_KEY_SECRET" },
        { status: 500 }
      );
    }

    // Expected signature: HMAC_SHA256(order_id|payment_id)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const valid = expectedSignature === razorpay_signature;

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid signature" },
        { status: 400 }
      );
    }

    // TODO: persist success (DB) / provision plan / send email
    console.log("✅ Verified payment:", {
      order: razorpay_order_id,
      payment: razorpay_payment_id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("verify-payment error", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
