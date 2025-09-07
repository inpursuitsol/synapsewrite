// app/api/generate/route.js
import OpenAI from "openai";

/**
 * Generalized RAG + caching + verification route.
 * - Region-aware retrieval via SerpAPI (if SERPAPI_KEY set).
 * - Uses in-memory cache by default; if USE_VERCEL_KV=1 it will try to use Vercel KV.
 * - Returns structured SEO JSON: { title, meta, content, faq, sources, verification, needsReview, notes, region, retrieved }
 *
 * Notes:
 * - Ensure OPENAI_API_KEY is set in Vercel. SERPAPI_KEY recommended.
 * - Optional envs:
 *    USE_VERCEL_KV=1   => route attempts to use @vercel/kv (if available)
 *    REVIEW_WEBHOOK    => optional webhook to notify on "needsReview" events
 */

const TRUSTED_GLOBAL = [
  "apple.com", "amazon.", "gsmarena.com", "theverge.com", "techradar.com", "wired.com", "bbc.com"
];
const REGION_TRUSTED = {
  in: ["flipkart.com", "91mobiles.com", "ndtv.com"],
  us: ["bestbuy.com", "cnet.com"],
  ca: ["bestbuy.ca"],
  uk: ["techadvisor.co.uk"],
};

function getTrusted(region = "us") {
  return Array.from(new Set([...(REGION_TRUSTED[region] || []), ...TRUSTED_GLOBAL]));
}
function isTrusted(link = "", region = "us") {
  if (!link) return false;
  const l = link.toLowerCase();
  return getTrusted(region).some((d) => l.includes(d));
}
function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// Simple in-memory cache (serverless: ephemeral). We also try Vercel KV if configured.
const localCache = new Map();
let kv = null;
let kvEnabled = false;
async function ensureKV() {
  if (kv !== null) return kvEnabled;
  if (process.env.USE_VERCEL_KV !== "1") { kv = null; kvEnabled = false; return false; }
  try {
    // dynamic import to avoid hard dependency if not using KV
    // if you use Vercel KV, make sure @vercel/kv is installed and KV is configured
    // Note: in some environments dynamic import may not be allowed; fallback to local cache
    // eslint-disable-next-line no-eval
    kv = await import("@vercel/kv");
    kvEnabled = Boolean(kv && kv.default);
    return kvEnabled;
  } catch (e) {
    console.warn("Vercel KV not available — falling back to in-memory cache.", e?.message || e);
    kv = null;
    kvEnabled = false;
    return false;
  }
}
async function cacheGet(key) {
  await ensureKV();
  if (kvEnabled) {
    try {
      return await kv.default.get(key);
    } catch (e) {
      console.warn("KV get failed", e?.message || e);
    }
  }
  return localCache.get(key);
}
async function cacheSet(key, value, ttlSec = 3600) {
  await ensureKV();
  if (kvEnabled) {
    try {
      if (ttlSec) await kv.default.set(key, value, { ex: ttlSec });
      else await kv.default.set(key, value);
      return true;
    } catch (e) {
      console.warn("KV set failed", e?.message || e);
    }
  }
  localCache.set(key, value);
  return true;
}

// SerpAPI helper
async function serpApiSearch(q, key, gl = "us", num = 6) {
  if (!key) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&gl=${encodeURIComponent(gl)}&num=${num}&api_key=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.warn("SerpAPI error", r.status, await r.text().catch(()=>""));
      return [];
    }
    const j = await r.json();
    const hits = (j.organic_results || []).map((it) => ({
      title: it.title || it.link || it.displayed_link || "",
      link: it.link || it.displayed_link || "",
      snippet: it.snippet || (it.rich_snippet?.top?.extensions || []).join(" ") || "",
    }));
    // dedupe
    const uniq = []; const seen = new Set();
    for (const h of hits) { if (!h.link) continue; if (seen.has(h.link)) continue; seen.add(h.link); uniq.push(h); }
    return uniq;
  } catch (e) {
    console.warn("SerpAPI fetch failed", e?.message || e);
    return [];
  }
}

// Heuristic to decide retrieval
function shouldRetrieve(topic = "", forceVerify = false) {
  if (forceVerify) return true;
  const t = (topic || "").toLowerCase();
  const sensitive = ["best","top","latest","new","release","price","available","compare","vs ","202","how many","where to buy"];
  return sensitive.some(k => t.includes(k));
}

function safeJSONResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

// optional webhook notify for needsReview
async function notifyReview(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payload) });
  } catch (e) {
    console.warn("Review webhook failed", e?.message || e);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(()=>({}));
    const topic = (body?.topic || "").toString().trim();
    const regionBody = (body?.region || "").toString().trim().toLowerCase();
    const language = (body?.language || "en").toString();
    const forceVerify = Boolean(body?.forceVerify);

    if (!topic) return safeJSONResponse({ error: "Missing topic" }, 400);

    // region fallback from Accept-Language
    let region = regionBody || "";
    if (!region) {
      const accept = (req.headers.get("accept-language") || "").split(",")[0] || "";
      const parts = accept.split("-");
      if (parts.length > 1) region = parts[1].toLowerCase();
    }
    if (!region) region = "us";

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return safeJSONResponse({ error: "OPENAI_API_KEY not set" }, 500);
    const serpKey = process.env.SERPAPI_KEY || "";
    const reviewWebhook = process.env.REVIEW_WEBHOOK || "";

    const openai = new OpenAI({ apiKey: openaiKey });

    // Simple cache key
    const cacheKey = `gen::${region}::${language}::${topic}`.toLowerCase().replace(/\s+/g,"::").slice(0,250);

    // Fast path: if cached and not forceVerify, return cache
    if (!forceVerify) {
      const cached = await cacheGet(cacheKey).catch(()=>null);
      if (cached) {
        return safeJSONResponse({ ...cached, cached: true });
      }
    }

    // Step 1: SEO outline prompt (structured JSON)
    const outlinePrompt = [
      { role: "system", content: "You are a professional SEO copywriter. Output ONLY a JSON object with keys: title, meta (<=160 chars), outline (array of H2 headings), faq (array [{q,a}])." },
      { role: "user", content: `Topic: ${topic}\nRegion: ${region}\nLanguage: ${language}\nReturn the JSON object.` },
    ];
    const outlineResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: outlinePrompt,
      max_tokens: 700,
      temperature: 0,
    });
    const outlineRaw = outlineResp?.choices?.[0]?.message?.content ?? outlineResp?.choices?.[0]?.text ?? "";
    let outline = safeParse(outlineRaw.trim());
    if (!outline) {
      const s = outlineRaw.indexOf("{");
      const e = outlineRaw.lastIndexOf("}");
      if (s !== -1 && e !== -1 && e > s) outline = safeParse(outlineRaw.slice(s, e+1));
    }
    if (!outline) outline = { title: topic, meta: `Article about ${topic}`, outline: ["Introduction"], faq: [] };

    // Decide retrieval
    const doRetrieve = shouldRetrieve(topic, forceVerify);
    let sources = [];
    let verification = { trustedCount: 0, note: "" };

    if (doRetrieve) {
      if (!serpKey) {
        verification.note = "Retrieval required but SERPAPI_KEY not set. Set SERPAPI_KEY to enable live verification.";
      } else {
        // try focused trusted search first
        const trustedPart = getTrusted(region).slice(0,6).map(d=>`site:${d}`).join(" OR ");
        let hits = await serpApiSearch(`${topic} ${trustedPart}`, serpKey, region, 8).catch(()=>[]);
        if (!hits || hits.length === 0) hits = await serpApiSearch(topic, serpKey, region, 10).catch(()=>[]);
        sources = (hits || []).slice(0, 12);
        verification.trustedCount = sources.filter(s => isTrusted(s.link, region)).length;
        verification.note = verification.trustedCount > 0 ? "Trusted sources found" : "No trusted sources found for this topic/region.";
      }
    } else {
      verification.note = "Retrieval not required for this topic.";
    }

    // Compose final article
    let finalContent = "";
    let needsReview = false;

    if (sources && sources.length > 0) {
      // choose best snippets: trusted first
      const trustedHits = sources.filter(s=>isTrusted(s.link, region));
      const chosen = trustedHits.length ? trustedHits.slice(0,6) : sources.slice(0,6);
      const context = chosen.map((s,i)=>`${i+1}. ${s.title}\n${s.link}\n${s.snippet || ""}`).join("\n\n");

      const composeSys = `
You are an evidence-driven writer. Use ONLY the provided web snippets to produce factual claims.
If a fact is not supported by provided snippets, write "I could not verify this".
Produce an SEO-ready article that uses outline headings and includes a Sources section listing URLs.
`;
      const composeUser = [
        `Topic: ${topic}`,
        `Region: ${region}`,
        `SEO outline: ${JSON.stringify(outline)}`,
        "",
        "Use ONLY these snippets (do not use external knowledge for facts):",
        context,
        "",
        "Requirements: title, one-sentence meta (<=160 chars), follow outline, include FAQ and Sources section."
      ].join("\n");

      const composeResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: composeSys }, { role: "user", content: composeUser }],
        max_tokens: 2000,
        temperature: 0.0,
      });

      finalContent = composeResp?.choices?.[0]?.message?.content ?? composeResp?.choices?.[0]?.text ?? "";
      needsReview = verification.trustedCount === 0 || (isSensitiveTopic(topic) && verification.trustedCount < 1);
    } else {
      // fallback: produce cautious article and flag review if retrieval expected but not possible
      const fallbackSys = `You are an SEO writer. Produce an article following the outline. Mark unverified facts with "I could not verify this".`;
      const fallbackUser = `Topic: ${topic}\nSEO outline: ${JSON.stringify(outline)}\nRequirements: title, meta, follow headings, mark unverified facts.`;
      const fallbackResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: fallbackSys }, { role: "user", content: fallbackUser }],
        max_tokens: 1600,
        temperature: 0.0,
      });
      finalContent = fallbackResp?.choices?.[0]?.message?.content ?? fallbackResp?.choices?.[0]?.text ?? "";
      needsReview = doRetrieve && !serpKey;
    }

    // If needsReview, notify webhook (optional) and record to a simple store (cache) for editor UI
    if (needsReview) {
      const reviewPayload = { topic, region, title: outline.title || topic, time: new Date().toISOString(), verification };
      if (reviewWebhook) await notifyReview(reviewWebhook, reviewPayload);
      // append to local "pending reviews" cache list
      const reviewKey = `pendingReviews`;
      const prev = (await cacheGet(reviewKey).catch(()=>null)) || [];
      prev.unshift(reviewPayload);
      await cacheSet(reviewKey, prev, 60*60*24*7).catch(()=>null); // keep week
    }

    const faq = Array.isArray(outline.faq) ? outline.faq.map(f => typeof f === "string" ? { q: f, a: "" } : { q: f.q || String(f), a: f.a || "" }) : [];

    const payload = {
      title: outline.title || topic,
      meta: outline.meta || "",
      content: finalContent,
      faq,
      sources,
      verification,
      needsReview,
      notes: verification.note,
      region,
      retrieved: doRetrieve && Boolean(serpKey),
    };

    // cache result for 30 minutes by default (unless forceVerify)
    if (!forceVerify) await cacheSet(cacheKey, payload, 60*30).catch(()=>null);

    return safeJSONResponse(payload, 200);
  } catch (err) {
    console.error("generate route error:", err);
    return safeJSONResponse({ error: err?.message ?? String(err) }, 500);
  }
}

// helper: sensitive topic detection
function isSensitiveTopic(topic="") {
  if (!topic) return false;
  const t = topic.toLowerCase();
  return ["health","medical","legal","finance","investment","stock","election","vote"].some(k => t.includes(k));
}
