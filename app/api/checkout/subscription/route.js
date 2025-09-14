// app/api/checkout/subscription/route.js
import { NextResponse } from "next/server";

/**
 * Robust check for mock mode: accepts "true", "1", "yes" (case-insensitive)
 * or boolean-like values.
 */
const isMockMode = (() => {
  const v = process.env.RAZORPAY_MOCK;
  if (typeof v === "string") {
    return ["true", "1", "yes"].includes(v.trim().toLowerCase());
  }
  return Boolean(v);
})();

/**
 * Helper: return a JSON response with a given status
 */
function jsonResponse(payload, status = 200) {
  return NextResponse.json(payload, { status });
}

/**
 * Helper: build a fake subscription object for mock mode
 */
function makeMockSubscription({ plan_id, total_count }) {
  const now = Date.now();
  const random = Math.floor(Math.random() * 90000) + 10000; // 10000-99999
  return {
    id: `sub_mock_${now}_${random}`,
    plan_id: plan_id ?? null,
    total_count: typeof total_count === "number" ? total_count : null,
    status: "created",
    mock: true,
    created_at: new Date().toISOString(),
  };
}

/**
 * Main POST handler
 */
export async function POST(request) {
  try {
    // parse body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { plan_id, total_count } = body ?? {};

    if (!plan_id) {
      return jsonResponse({ error: "plan_id is required" }, 400);
    }

    // If mock mode, return fake subscription
    if (isMockMode) {
      const mock = makeMockSubscription({ plan_id, total_count });
      return jsonResponse(mock, 201);
    }

    // Not mock mode — require Razorpay keys
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return jsonResponse(
        { error: "Razorpay not configured on server" },
        500
      );
    }

    // Build form data for Razorpay subscription creation.
    // Razorpay expects form-encoded values for many endpoints.
    const params = new URLSearchParams();
    params.append("plan_id", plan_id);
    // Optional: append total_count if provided (some integrations may expect it)
    if (typeof total_count !== "undefined") {
      // Convert to string; Razorpay expects strings in form data
      params.append("total_count", String(total_count));
    }

    // Basic auth header
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const resp = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Pass Razorpay error details through for easier debugging
      return jsonResponse(
        {
          error: "Razorpay API error",
          status: resp.status,
          body: data,
        },
        502
      );
    }

    // Successful real subscription creation — return Razorpay response
    return jsonResponse(data, 201);
  } catch (err) {
    // unexpected server error
    // (avoid printing secrets; only log message)
    // If you want more debugging, add console.error(err) — Vercel logs will show it.
    return jsonResponse({ error: "Internal server error", message: String(err) }, 500);
  }
}
