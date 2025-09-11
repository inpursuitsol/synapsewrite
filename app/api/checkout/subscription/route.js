/**
 * Create a Razorpay subscription (server-side).
 * Expects:
 *  - Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 *  - Request body JSON: { plan_id: "plan_xyz", total_count?: number, customer?: {name,email,contact} }
 *
 * Response:
 *  - 200: { subscription: { ... } }
 *  - 4xx/5xx: { error: ... }
 *
 * NOTE: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel envs (Preview/Production) before using.
 */

export async function POST(req) {
  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID || !KEY_SECRET) {
    return new Response(JSON.stringify({ error: "Razorpay not configured on server" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan_id = body.plan_id;
    if (!plan_id) {
      return new Response(JSON.stringify({ error: "plan_id is required in request body" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

    const payload = {
      plan_id,
      total_count: body.total_count || 12,
      quantity: 1,
      customer_notify: 1,
    };

    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ subscription: data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("razorpay subscription error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
