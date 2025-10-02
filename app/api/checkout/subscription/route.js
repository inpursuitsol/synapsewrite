import Razorpay from "razorpay";

export async function POST(req) {
  try {
    let payload = {};
    try { payload = await req.json(); } catch {}
    const amount = Number(payload.amount) || 9900; // paise => ₹99.00
    const currency = (payload.currency || "INR").toUpperCase();
    const receipt = payload.receipt || `synapsewrite-pro-${Date.now()}`;

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return new Response(JSON.stringify({ error: "Missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET" }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    const rzp = new Razorpay({ key_id, key_secret });
    const order = await rzp.orders.create({
      amount, currency, receipt, payment_capture: 1,
    });

    return new Response(JSON.stringify(order), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Order creation failed" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "content-type": "application/json" },
  });
}
