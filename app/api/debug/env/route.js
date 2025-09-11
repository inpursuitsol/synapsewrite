export async function GET() {
  const debug = {
    RAZORPAY_MOCK: process.env.RAZORPAY_MOCK ?? null,
    HAS_RAZORPAY_KEYS: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    NODE_ENV: process.env.NODE_ENV ?? null
  };
  return new Response(JSON.stringify(debug), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
