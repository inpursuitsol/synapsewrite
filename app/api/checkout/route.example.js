// app/api/checkout/route.js
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO; // price id for Pro plan
const PRICE_ID_STARTER = process.env.STRIPE_PRICE_ID_STARTER; // optional

export async function POST(req) {
  if (!stripeSecret) {
    return new Response(JSON.stringify({ error: "Stripe not configured on server" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan || "pro";
    const stripe = new Stripe(stripeSecret, { apiVersion: "2022-11-15" });

    let priceId = PRICE_ID_PRO;
    if (plan === "starter" && PRICE_ID_STARTER) priceId = PRICE_ID_STARTER;

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price ID not configured for plan" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const protocol = (process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    const successUrl = `${protocol}/?checkout=success`;
    const cancelUrl = `${protocol}/?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("checkout error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
