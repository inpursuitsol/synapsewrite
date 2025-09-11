// app/api/checkout/subscription/route.js
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;


export async function POST(req) {
if (!KEY_ID || !KEY_SECRET) return new Response(JSON.stringify({ error: 'Razorpay not configured' }), { status: 500 });


try {
const body = await req.json().catch(() => ({}));
const plan_id = body.plan_id; // required
if (!plan_id) return new Response(JSON.stringify({ error: 'plan_id required' }), { status: 400 });


const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
const payload = {
plan_id,
total_count: body.total_count || 12, // number of cycles (optional)
quantity: 1,
customer_notify: 1,
// optionally pass customer details to avoid creating customer later
// customer: { name: 'Name', email: 'email@example.com', contact: '+91xxxxxxxxxx' }
};


const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
body: JSON.stringify(payload),
});


const data = await res.json();
if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: 400 });


return new Response(JSON.stringify({ subscription: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
} catch (err) {
console.error(err);
return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
}
}
