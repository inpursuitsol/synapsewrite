// app/api/checkout/order/route.js
import crypto from 'crypto';


const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;


export async function POST(req) {
if (!KEY_ID || !KEY_SECRET) {
return new Response(JSON.stringify({ error: 'Razorpay not configured on server' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
}


try {
const body = await req.json().catch(() => ({}));
// amount in paise (100 INR = 10000 paise)
const amount = body.amount || 10000;


const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
const res = await fetch('https://api.razorpay.com/v1/orders', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: `Basic ${auth}`,
},
body: JSON.stringify({
amount,
currency: 'INR',
receipt: `rcpt_${Date.now()}`,
payment_capture: 1,
}),
});


const order = await res.json();
if (!res.ok) return new Response(JSON.stringify({ error: order }), { status: 400 });


return new Response(JSON.stringify({ order }), { status: 200, headers: { 'Content-Type': 'application/json' } });
} catch (err) {
console.error('order error', err);
return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
}
}
