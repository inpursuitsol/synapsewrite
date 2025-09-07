// app/api/review/route.js
/**
 * Human Review API endpoint
 *
 * Supports:
 * - POST /api/review → create a review record
 * - GET  /api/review → list all pending review records
 *
 * Env vars:
 * - USE_VERCEL_KV=1 (optional) → store in Vercel KV (@vercel/kv must be configured)
 * - REVIEW_WEBHOOK (optional) → if set, POSTs new reviews to this webhook (Slack/Discord/Notion/etc.)
 */

let kv = null;
let kvEnabled = false;

async function tryKV() {
  if (kv !== null) return kvEnabled;
  if (process.env.USE_VERCEL_KV !== "1") {
    kv = null;
    kvEnabled = false;
    return false;
  }
  try {
    kv = await import("@vercel/kv");
    kvEnabled = Boolean(kv && kv.default);
    return kvEnabled;
  } catch (e) {
    console.warn("KV not available, fallback to memory cache", e?.message || e);
    kv = null;
    kvEnabled = false;
    return false;
  }
}

async function cacheGet(key) {
  await tryKV();
  if (kvEnabled) {
    try {
      return await kv.default.get(key);
    } catch (e) {
      console.warn("KV get failed", e?.message || e);
    }
  }
  // fallback: global memory (ephemeral)
  global._pendingReviews = global._pendingReviews || [];
  return global._pendingReviews;
}

async function cacheSet(key, value) {
  await tryKV();
  if (kvEnabled) {
    try {
      await kv.default.set(key, value);
      return true;
    } catch (e) {
      console.warn("KV set failed", e?.message || e);
    }
  }
  global._pendingReviews = value;
  return true;
}

// --- POST handler: add a review record ---
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = body?.topic || null;
    if (!topic) {
      return new Response(JSON.stringify({ error: "Missing topic" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const record = {
      id: `r_${Date.now()}`,
      topic,
      region: body?.region || "unspecified",
      reason: body?.reason || "User requested review",
      payload: body?.payload || null,
      time: new Date().toISOString(),
    };

    // Optional: send to webhook
    const webhook = process.env.REVIEW_WEBHOOK || "";
    if (webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
      } catch (e) {
        console.warn("Review webhook failure", e?.message || e);
      }
    }

    // Save in cache (prepend)
    const key = "pendingReviews";
    const prev = (await cacheGet(key)) || [];
    prev.unshift(record);
    await cacheSet(key, prev);

    return new Response(JSON.stringify({ ok: true, record }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("review POST error", e);
    return new Response(
      JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// --- GET handler: list all pending reviews ---
export async function GET() {
  try {
    const key = "pendingReviews";
    const records = (await cacheGet(key)) || [];

    return new Response(JSON.stringify(records), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("review GET error", e);
    return new Response(
      JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
