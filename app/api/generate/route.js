// app/api/generate/route.js
import { kv } from "@vercel/kv";

/**
 * Simple free-vs-paid feature gate using Vercel KV.
 * - Free users: FREE_DAILY_LIMIT per day (default 2)
 * - Paid users: unlimited (kv key: subscription:{userId} with { active: true })
 *
 * NOTE: Replace the demo OpenAI placeholder with your actual generation/streaming code.
 */

const FREE_DAILY_LIMIT = 2;

function todayKey(userId) {
  const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `usage:${userId}:${d}`;
}

function subscriptionKey(userId) {
  return `subscription:${userId}`;
}

export async function POST(req) {
  try {
    // === 1) Identify user ===
    // TEMP: demo - replace with real auth/session logic
    const userId = req.headers.get("x-user-id") || "demo-user";
    if (!userId) {
      return new Response(JSON.stringify({ error: "no user id" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // === 2) Check subscription status (paid users bypass limit) ===
    const subKey = subscriptionKey(userId);
    const subscription = await kv.get(subKey);
    const isPaid = Boolean(subscription && subscription.active);

    // === 3) If not paid, check daily usage from KV ===
    if (!isPaid) {
      const key = todayKey(userId);
      let count = await kv.get(key);
      count = Number(count || 0);
      if (count >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: "Free daily limit reached. Upgrade to continue." }), { status: 402, headers: { "Content-Type": "application/json" } });
      }
      // increment usage
      await kv.set(key, count + 1);

      // set TTL to expire at end of day (best-effort)
      try {
        const secondsUntilMidnight = Math.ceil((new Date().setHours(24,0,0,0) - Date.now()) / 1000);
        if (typeof kv.expire === "function") {
          await kv.expire(key, secondsUntilMidnight);
        } else {
          // fallback: set companion expiry key (non-blocking)
          await kv.set(`expiry:${key}`, Date.now() + secondsUntilMidnight * 1000);
        }
      } catch (e) {
        console.warn("KV TTL set failed (non-fatal):", e?.message || e);
      }
    }

    // === 4) Proceed with generation ===
    // Replace the following with your real OpenAI streaming/generation logic.
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || "Write a short article about AI in 3 paragraphs.";

    // *** Dummy generation placeholder (replace with OpenAI call) ***
    const generated = `Generated article for user ${userId}:\n\n${prompt}\n\n(This is a placeholder. Replace with your OpenAI generation code.)`;

    return new Response(JSON.stringify({ success: true, text: generated }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
