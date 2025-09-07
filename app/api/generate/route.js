// app/api/generate/route.js
import OpenAI from "openai";

/**
 * RAG-style generation + verification route
 *
 * Flow:
 * 1) Ask model for a structured list of recommended products for the topic (JSON).
 * 2) For each candidate product, run 3 focused SerpAPI queries restricted to India to gather authoritative links/snippets.
 * 3) Keep candidates that have at least one "official" or trusted retailer link (domain whitelist).
 * 4) Send verified snippets back to the model with a strict instruction: "Write the article using only these snippets".
 * 5) If too few verified candidates remain, return needsReview: true to force human review.
 *
 * Environment variables required:
 * - OPENAI_API_KEY (required)
 * - SERPAPI_KEY (recommended — set in Vercel)
 */

const TRUSTED_DOMAINS = [
  "apple.com",
  "flipkart.com",
  "amazon.in",
  "gsmarena.com",
  "91mobiles.com",
  "ndtv.com",
  "theverge.com",
  "techradar.com",
];

async function serpApiSearch(q, key, num = 6) {
  if (!key) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&gl=in&hl=en&num=${num}&api_key=${encodeURIComponent(
    key
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("SerpAPI fetch failed", res.status);
    return [];
  }
  const j = await res.json().catch(() => ({}));
  const hits = (j.organic_results || []).map((r) => ({
    title: r.title || r.link || "",
    link: r.link || r.displayed_link || "",
    snippet: r.snippet || (r.rich_snippet?.top?.extensions || []).join(" ") || "",
  }));
  // dedupe and return
  const uniq = [];
  const seen = new Set();
  for (const h of hits) {
    if (!h.link) continue;
    if (seen.has(h.link)) continue;
    seen.add(h.link);
    uniq.push(h);
  }
  return uniq;
}

function isTrusted(link = "") {
  const l = (link || "").toLowerCase();
  return TRUSTED_DOMAINS.some((d) => l.includes(d));
}

function safeJSONParse(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = (body?.topic || "").toString().trim();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Missing topic" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const serpKey = process.env.SERPAPI_KEY || "";

    // Step 1: ask model for structured candidate products (guarantee JSON output)
    const now = new Date().toISOString().slice(0, 10);
    const askCandidates = [
      {
        role: "system",
        content:
          `You are an assistant that returns a JSON array of recommended products for the requested topic.`
          + ` Output ONLY valid JSON — an object: { "candidates": [{ "name":"", "short_reason":"" }] } and nothing else.`,
      },
      {
        role: "user",
        content: `Topic: ${topic}\n\nReturn a JSON object like:\n{ "candidates": [ { "name": "Model name", "short_reason": "one-line reason why this fits the topic (India-specific)"} ] }\n\nKeep suggestions to maximum 8 candidates. Use low creativity — factual suggestions only.`,
      },
    ];

    const candidateResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: askCandidates,
      max_tokens: 800,
      temperature: 0.0,
    });

    const candidateRaw = candidateResp?.choices?.[0]?.message?.content ?? candidateResp?.choices?.[0]?.text ?? "";
    let parsed = safeJSONParse(candidateRaw.trim());
    if (!parsed) {
      // try to extract JSON braces block
      const bStart = candidateRaw.indexOf("{");
      const bEnd = candidateRaw.lastIndexOf("}");
      if (bStart !== -1 && bEnd !== -1 && bEnd > bStart) {
        parsed = safeJSONParse(candidateRaw.slice(bStart, bEnd + 1));
      }
    }
    if (!parsed || !Array.isArray(parsed.candidates)) {
      // failed to get structured candidates — fallback: return error
      return new Response(JSON.stringify({ error: "Failed to parse candidate list from model. Try again." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const candidates = parsed.candidates.slice(0, 8);

    // Step 2: For each candidate, run focused searches and collect sources
    const verification = {}; // name -> { sources: [], trustedCount, allHits }
    for (const c of candidates) {
      const name = (c.name || "").toString();
      if (!name) continue;
      // queries: <name> India release date, <name> India price, <name> specs India
      const queries = [
        `${name} India release date`,
        `${name} India price`,
        `${name} specs`,
      ];
      let hits = [];
      if (serpKey) {
        for (const q of queries) {
          const r = await serpApiSearch(q, serpKey, 6).catch(() => []);
          for (const h of r) {
            if (!hits.find((x) => x.link === h.link)) hits.push(h);
          }
        }
      }
      // count trusted hits
      const trustedHits = hits.filter((h) => isTrusted(h.link));
      verification[name] = {
        name,
        short_reason: c.short_reason || "",
        sources: hits,
        trustedCount: trustedHits.length,
      };
    }

    // Step 3: filter candidates to only those with at least 1 trusted source
    const VERIFIED_THRESHOLD = 1; // require at least one trusted link (adjustable)
    const verifiedCandidates = candidates.filter((c) => {
      const v = verification[c.name];
      return v && v.trustedCount >= VERIFIED_THRESHOLD;
    });

    // If too few verified candidates (e.g., less than 1/2 of suggested), set needsReview
    const needsReview = verifiedCandidates.length < Math.max(1, Math.round(candidates.length / 2));

    // Step 4: If we have verified snippets, build a context string and ask model to compose final article using only these snippets
    let finalArticle = "";
    const collectedSourcesText = [];
    if (verifiedCandidates.length > 0) {
      // create context
      for (const vc of verifiedCandidates) {
        const v = verification[vc.name];
        // prefer trusted hits first
        const trusted = v.sources.filter((s) => isTrusted(s.link));
        const chosen = trusted.length ? trusted.slice(0, 3) : v.sources.slice(0, 3);
        for (const s of chosen) {
          collectedSourcesText.push(`- ${vc.name} >> ${s.title}\n${s.link}\n${s.snippet || ""}`);
        }
      }

      const composeSys = `
You are a factual writer. Use ONLY the provided source snippets below to write a buyer-friendly article on the requested topic.
If a fact is not supported by the provided snippets, write "I could not verify this" for that fact.
Do not invent release dates, prices, or availability.
Output plain text (Markdown ok). Include a "Sources" section listing the URLs used.
`;

      const composeUser = [
        `Topic: ${topic}`,
        "",
        `Verified source snippets (use these only):\n${collectedSourcesText.join("\n\n")}`,
        "",
        `Requirements:\n- Start with 2-3 sentence summary.\n- For each verified product, provide model name, release month & year (only if present in sources), a short pros/cons, and explicit evidence links.\n- At end include Sources with clickable URLs.`,
      ].join("\n");

      const finalResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: composeSys },
          { role: "user", content: composeUser },
        ],
        max_tokens: 2000,
        temperature: 0.0,
      });

      finalArticle = finalResp?.choices?.[0]?.message?.content ?? finalResp?.choices?.[0]?.text ?? "";
    } else {
      // No verified candidates: do not return a fully confident article. Return model-less cautious summary or ask for human review.
      finalArticle = `We could not find enough authoritative sources (Apple / Flipkart / Amazon / trusted review sites) for confident recommendations on "${topic}". This item has been flagged for human review.`;
    }

    // Prepare response
    return new Response(
      JSON.stringify({
        content: finalArticle,
        candidates,
        verification,
        verifiedCandidates: verifiedCandidates.map((c) => c.name),
        needsReview,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Generate route error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
