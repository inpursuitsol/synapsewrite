// app/api/review/route.js
/**
 * Human Review API endpoint
 *
 * POST body: { topic, region, reason, payload }
 *   - topic: the topic string
 *   - region: e.g. "us", "in"
 *   - reason: reason for requesting review (string)
 *   - payload: the article JSON or a link to it
 *
 * Behavior:
 * - If REVIEW_WEBHOOK env is set, posts record to webhook (Slack/Discord/Notion/etc.).
 * - Saves record in cache:
 *    - If USE_VERCEL_KV=1, uses @vercel/kv (requires KV integration).
 *    - Else uses in-memory fallback (ephemeral).
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

    // Save to cache
    const key = "pendingReviews";
    const prev = (await cacheGet(key)) || [];
    prev.unshift(record);
    await cacheSet(key, prev);

    return new Response(JSON.stringify({ ok: true, record }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("review route error", e);
    return new Response(
      JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
