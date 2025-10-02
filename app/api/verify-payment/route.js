// app/api/verify-payment/route.js
import crypto from "crypto";

export const dynamic = "force-dynamic"; // don't cache
export const runtime = "nodejs";        // ensure Node runtime

export async function POST(req) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
        status: 400, headers: { "content-type": "application/json" },
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ ok: false, error: "Missing RAZORPAY_KEY_SECRET" }), {
        status: 500, headers: { "content-type": "application/json" },
      });
    }

    // Create expected signature: HMAC_SHA256(order_id|payment_id)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

    const valid = expected === razorpay_signature;

    return new Response(JSON.stringify({ ok: valid }), {
      status: valid ? 200 : 400,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Verify failed" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
