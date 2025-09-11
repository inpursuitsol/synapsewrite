// app/api/webhooks/razorpay/route.js
import crypto from 'crypto';


const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;


export async function POST(req) {
const bodyText = await req.text();
const signature = req.headers.get('x-razorpay-signature');


if (!WEBHOOK_SECRET) {
console.error('No webhook secret set');
return new Response('Webhook misconfigured', { status: 500 });
}


const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(bodyText).digest('hex');
if (expected !== signature) {
console.warn('Webhook signature mismatch', { expected, signature });
return new Response('Invalid signature', { status: 400 });
}


const event = JSON.parse(bodyText);
// handle relevant events: payment.captured, payment.failed, subscription.charged, subscription.cancelled, etc.
console.log('Razorpay webhook event:', event.event, event.payload?.payment, event.payload?.subscription);


// TODO: implement your business logic (save subscription id, map to user, activate access, etc.)


return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
