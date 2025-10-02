// app/api/webhooks/razorpay/route.js
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Missing RAZORPAY_WEBHOOK_SECRET", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  // Verify webhook signature
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const valid = signature === expected;
  if (!valid) return new Response("Invalid signature", { status: 400 });

  // Parse the event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  // Example: handle captured payment
  if (event?.event === "payment.captured") {
    // const paymentId = event.payload.payment.entity.id;
    // const orderId = event.payload.payment.entity.order_id;
    // TODO: mark order as paid in DB (future when auth/DB exist)
  }

  return new Response("ok", { status: 200 });
}
