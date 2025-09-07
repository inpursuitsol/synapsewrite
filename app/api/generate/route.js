// app/api/generate/route.js
import OpenAI from "openai";

/**
 * Generalized, region-aware RAG + SEO generation route.
 *
 * POST body: { topic: string, region?: "in"|"us"|..., language?: "en", forceVerify?: boolean }
 *
 * Response JSON:
 * {
 *   title, meta, content, faq, sources: [{title,link,snippet}], verification: { trustedCount, note },
 *   needsReview: bool, notes: string, region: string, retrieved: bool
 * }
 *
 * Env:
 *  - OPENAI_API_KEY (required)
 *  - SERPAPI_KEY (optional but recommended for live verification)
 */

const GLOBAL_TRUSTED = [
  "apple.com",
  "amazon.",
  "gsmarena.com",
  "theverge.com",
  "techradar.com",
  "wired.com",
  "bbc.com",
  "cnn.com",
];

const REGION_TRUSTED_MAP = {
  in: ["flipkart.com", "91mobiles.com", "ndtv.com"],
  us: ["bestbuy.com", "cnet.com"],
  uk: ["argos.co.uk", "techadvisor.co.uk"],
  ca: ["bestbuy.ca"],
  de: ["chip.de"],
  fr: ["lesnumeriques.com"],
  sg: ["shoppe", "lazada"], // best-effort, not exhaustive
};

function getTrustedDomainsForRegion(region = "us") {
  const regionList = REGION_TRUSTED_MAP[region] || [];
  return Array.from(new Set([...GLOBAL_TRUSTED, ...regionList]));
}

function isTrustedLink(link = "", region = "us") {
  if (!link) return false;
  const l = (link || "").toLowerCase();
  const trusted = getTrustedDomainsForRegion(region);
  return trusted.some((d) => l.includes(d));
}

function safeJSONParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function serpApiSearch(query, serpKey, gl = "us", num = 6) {
  if (!serpKey) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&gl=${encodeURIComponent(
    gl
  )}&num=${num}&api_key=${encodeURIComponent(serpKey)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("SerpAPI error", res.status, await res.text().catch(() => ""));
      return [];
    }
    const j = await res.json();
    const hits = (j.organic_results || []).map((r) => ({
      title: r.title || r.link || r.displayed_link || "",
      link: r.link || r.displayed_link || "",
      snippet: r.snippet || (r.rich_snippet?.top?.extensions || []).join(" ") || "",
    }));
    // dedupe by link
    const uniq = [];
    const seen = new Set();
    for (const h of hits) {
      if (!h.link) continue;
      if (seen.has(h.link)) continue;
      seen.add(h.link);
      uniq.push(h);
    }
    return uniq;
  } catch (err) {
    console.warn("SerpAPI request failed:", err?.message ?? err);
    return [];
  }
}

function shouldUseRetrieval(topic = "", forceVerify = false) {
  if (forceVerify) return true;
  if (!topic) return false;
  const t = topic.toLowerCase();
  // keywords suggesting recency or factual verification
  const keywords = [
    "best",
    "top",
    "latest",
    "new",
    "release",
    "release date",
    "price",
    "available",
    "compare",
    "vs ",
    "202",
    "2025",
    "2024",
    "how many",
    "how to",
  ];
  return keywords.some((k) => t.includes(k));
}

function isSensitiveTopic(topic = "") {
  if (!topic) return false;
  const t = topic.toLowerCase();
  const sensitive = ["health", "medical", "legal", "law", "finance", "stock", "investment", "election", "vote"];
  return sensitive.some((k) => t.includes(k));
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = (body?.topic || "").toString().trim();
    const forceVerify = Boolean(body?.forceVerify);
    let region = (body?.region || "").toString().trim().toLowerCase();
    const language = (body?.language || "").toString().trim().toLowerCase() || "en";

    if (!topic) {
      return new Response(JSON.stringify({ error: "Missing 'topic' in request body." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // fallback region detection from accept-language header
    if (!region) {
      const accept = (req.headers.get("accept-language") || "").split(",")[0] || "";
      const parts = accept.split("-");
      if (parts.length > 1) region = parts[1].toLowerCase();
    }
    if (!region) region = "us";

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const serpKey = process.env.SERPAPI_KEY || "";

    const useRetrieval = shouldUseRetrieval(topic, forceVerify);
    const openai = new OpenAI({ apiKey: openaiKey });

    // 1) Ask the model for an SEO outline (title/meta/outline/faq)
    const outlinePrompt = [
      {
        role: "system",
        content:
          "You are an expert SEO copywriter. Output ONLY a JSON object with keys: title, meta (single sentence <=160 chars), outline (array of strings for H2 headings), and faq (array of objects {q,a}).",
      },
      { role: "user", content: `Topic: ${topic}\nRegion: ${region}\nLanguage: ${language}\nReturn the JSON object.` },
    ];

    const outlineResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: outlinePrompt,
      max_tokens: 700,
      temperature: 0.0,
    });

    const outlineRaw = outlineResp?.choices?.[0]?.message?.content ?? outlineResp?.choices?.[0]?.text ?? "";
    let outline = safeJSONParse(outlineRaw.trim());
    if (!outline) {
      const s = outlineRaw.indexOf("{");
      const e = outlineRaw.lastIndexOf("}");
      if (s !== -1 && e !== -1 && e > s) outline = safeJSONParse(outlineRaw.slice(s, e + 1));
    }
    if (!outline) {
      outline = {
        title: topic,
        meta: `An article about ${topic}.`,
        outline: ["Introduction", "Main points", "Conclusion"],
        faq: [],
      };
    }

    // 2) If retrieval is needed, fetch regional snippets
    let sources = [];
    let verification = { trustedCount: 0, note: "" };
    if (useRetrieval) {
      if (!serpKey) {
        verification.note = "Retrieval needed but SERPAPI_KEY is not set. Enable SERPAPI_KEY for live verification.";
      } else {
        // Focused query: try trusted sites first then general query
        const trustedCandidates = getTrustedDomainsForRegion(region)
          .slice(0, 6)
          .map((d) => `site:${d}`)
          .join(" OR ");

        let hits = [];
        try {
          const focusedQuery = `${topic} ${trustedCandidates ? ` ${trustedCandidates}` : ""}`;
          hits = await serpApiSearch(focusedQuery.trim(), serpKey, region, 8);
          if (!hits || hits.length === 0) {
            hits = await serpApiSearch(topic, serpKey, region, 10);
          }
        } catch (err) {
          console.warn("Search error:", err?.message ?? err);
          hits = [];
        }
        sources = (hits || []).slice(0, 12);
        const trustedCount = sources.filter((s) => isTrustedLink(s.link, region)).length;
        verification.trustedCount = trustedCount;
        verification.note = trustedCount > 0 ? "Trusted sources found." : "No trusted sources found for this topic in the selected region.";
      }
    } else {
      verification.note = "Retrieval not required for this topic.";
    }

    // 3) Compose final article
    let finalContent = "";
    let needsReview = false;

    if (sources && sources.length > 0) {
      // build context prioritized by trusted domain hits
      const trustedHits = sources.filter((s) => isTrustedLink(s.link, region));
      const chosen = trustedHits.length ? trustedHits.slice(0, 6) : sources.slice(0, 6);
      const context = chosen.map((s, i) => `${i + 1}. ${s.title}\n${s.link}\n${s.snippet || ""}`).join("\n\n");

      const composeSys = `
You are an evidence-driven content writer. You have been provided ONLY the following web snippets as the source of truth.
Use ONLY these snippets for factual claims (release dates, prices, availability). If a fact is not present, write "I could not verify this".
Write an SEO-ready article using the provided outline. Include a "Sources" section listing the used URLs.
`;

      const composeUser = [
        `Topic: ${topic}`,
        `Region: ${region}`,
        `SEO outline: ${JSON.stringify(outline)}`,
        "",
        "Use these snippets for verification (do not use information outside them):",
        context,
        "",
        "Requirements:\n- Output the article (Markdown okay).\n- Start with the SEO title and a one-line meta description.\n- Follow the outline headings.\n- Add FAQ section from outline.faq.\n- End with Sources listing the URLs used.",
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
      // No sources available: create a cautious SEO article but mark review if retrieval was expected
      const fallbackSys = `
You are a careful SEO writer. Produce a cautious article from the outline given. For time-sensitive facts that need verification, say "I could not verify this".
`;
      const fallbackUser = [
        `Topic: ${topic}`,
        `SEO outline: ${JSON.stringify(outline)}`,
        "",
        "Requirements:\n- Provide title & meta.\n- Follow outline headings.\n- For claims that require live verification, write 'I could not verify this'.",
      ].join("\n");

      const fallbackResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: fallbackSys }, { role: "user", content: fallbackUser }],
        max_tokens: 1600,
        temperature: 0.0,
      });

      finalContent = fallbackResp?.choices?.[0]?.message?.content ?? fallbackResp?.choices?.[0]?.text ?? "";
      needsReview = useRetrieval && !serpKey; // retrieval requested but not possible OR lack of sources
      if (isSensitiveTopic(topic)) needsReview = true;
    }

    const faq = Array.isArray(outline.faq)
      ? outline.faq.map((f) => (typeof f === "string" ? { q: f, a: "" } : { q: f.q || String(f), a: f.a || "" }))
      : [];

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
      retrieved: useRetrieval && Boolean(serpKey),
    };

    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("generate route error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
