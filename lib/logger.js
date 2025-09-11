// lib/logger.js
/**
 * Simple server-side logger:
 * - Always logs to console (Vercel shows this in deployment logs).
 * - Optionally forwards logs to Logflare if env vars are set.
 *
 * Env:
 *   LOGFLARE_SOURCE_ID
 *   LOGFLARE_WRITE_KEY
 */

const LOGFLARE_SOURCE_ID = process.env.LOGFLARE_SOURCE_ID || null;
const LOGFLARE_WRITE_KEY = process.env.LOGFLARE_WRITE_KEY || null;

export async function sendLog(event) {
  try {
    const payload = {
      ts: new Date().toISOString(),
      ...event,
    };

    // Always log to console (you’ll see this in Vercel logs)
    console.log(JSON.stringify(payload));

    // Forward to Logflare if env vars exist
    if (LOGFLARE_SOURCE_ID && LOGFLARE_WRITE_KEY) {
      const url = `https://api.logflare.app/logs?api_key=${LOGFLARE_WRITE_KEY}&source=${LOGFLARE_SOURCE_ID}`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([payload]),
      });
    }
  } catch (err) {
    console.warn("[logger] forward failed:", err?.message || err);
  }
}
