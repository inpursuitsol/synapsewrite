// app/api/generate/route.js
import OpenAI from "openai";

/**
 * Generalized RAG-enabled SEO article generation endpoint.
 *
 * Input JSON (POST):
 * {
 *   "topic": "Best iPhones available in India",
 *   "region": "in"           // optional, ISO country code (e.g., "in", "us", "gb")
 * }
 *
 * Output JSON:
 * {
 *   title: "...",
 *   meta: "...",
 *   content: "...",         // markdown/plain text
 *   faq: [{q:"", a:""}],
 *   sources: [{title,link,snippet}],
 *   verification: {trustedCount: N, note: "..."},
 *   needsReview: boolean,
 *   notes: "..."
 * }
 *
 * Env required:
 * - OPENAI_API_KEY (required)
 * - SERPAPI_KEY (optional) — enables live search retrieval (recommended)
 */

const TRUSTED_DOMAINS = [
  "apple.com",
  "flipkart.com",
  "amazon.in",
  "amazon.com",
  "gsmarena.com",
  "91mobiles.com",
  "ndtv.com",
  "theverge.com",
  "techradar.com",
  "wired.com",
  "bbc.com",
];

function isTrustedLink(link = "") {
  if (!link) return false;
  const l = link.toLowerCase();
  return TRUSTED_DOMAINS.some((d) => l.includes(d));
}

function safeJSONParse(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

async function serpApiSearch(query, serpKey, gl = "us", num = 6) {
  if (!serpKey) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&gl=${encodeURIComponent(
    gl
  )}&num=${num}&api_key=${encodeURIComponent(serpKey)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.warn("SerpAPI error", res.status, await res.text().catch(() => ""));
      return [];
    }
    const j = await res.json();
    const results = (j.organic_results || []).map((r) => ({
      title: r.title || r.link || r.displayed_link || "",
      link: r.link || r.displayed_link || "",
      snippet: r.snippet || (r.rich_snippet?.top?.extensions || []).join(" ") || "",
    }));
    // dedupe by link
    const uniq = [];
    const seen = new Set();
    for (const r of results) {
      if (!r.link) continue;
      if (seen.has(r.link)) continue;
      seen.add(r.link);
      uniq.push(r);
    }
    return uniq;
  } catch (err) {
    console.warn("SerpAPI fetch failed:", err?.message ?? err);
    return [];
  }
}

function shouldUseRetrieval(topic) {
  if (!topic) return false;
  const t = topic.toLowerCase();
  // keywords that suggest freshness/facts needed
  const retrievalKeywords = [
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
    "in ",
    "202",
    "2025",
    "2024",
  ];
  return retrievalKeywords.some((k) => t.includes(k));
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = (body?.topic || "").toString().trim();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Missing topic" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Determine region: request body -> Accept-Language header -> default 'us'
    let region = (body?.region || "").toString().trim().toLowerCase();
    if (!region) {
      const accept = (req.headers.get("accept-language") || "").split(",")[0] || "";
      // try to extract country from accept-language like en-IN -> in
      const parts = accept.split("-");
      if (parts.length > 1) region = parts[1].toLowerCase();
    }
    if (!region) region = "us";

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const serpKey = process.env.SERPAPI_KEY || "";

    const openai = new OpenAI({ apiKey: openaiKey });

    // Step A: create SEO outline (title, meta, headings, 3-5 FAQ prompts)
    const outlinePrompt = [
      {
        role: "system",
        content:
          "You are an expert SEO copywriter that outputs structured SEO-ready metadata and outline. " +
          "Return a JSON object ONLY with keys: title, meta, outline (array of heading strings), faq (array of {q,a} pairs - short answers). " +
          "Be concise and use the topic as given.",
      },
      { role: "user", content: `Topic: ${topic}\n\nReturn the JSON object.` },
    ];

    const outlineResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: outlinePrompt,
      max_tokens: 600,
      temperature: 0.0,
    });

    const outlineRaw = outlineResp?.choices?.[0]?.message?.content ?? outlineResp?.choices?.[0]?.text ?? "";
    let outline = safeJSONParse(outlineRaw.trim());
    if (!outline) {
      // try to extract JSON block
      const s = outlineRaw.indexOf("{");
      const e = outlineRaw.lastIndexOf("}");
      if (s !== -1 && e !== -1 && e > s) {
        outline = safeJSONParse(outlineRaw.slice(s, e + 1));
      }
    }
    // If still no outline, provide a fallback
    if (!outline) {
      outline = {
        title: topic,
        meta: `An article about ${topic}.`,
        outline: ["Introduction", "Main points", "Conclusion"],
        faq: [],
      };
    }

    // Decide whether to retrieve live web snippets
    const doRetrieve = shouldUseRetrieval(topic);
    let sources = [];
    let verification = { trustedCount: 0, note: "" };

    if (doRetrieve && serpKey) {
      // Build a focused query that mixes site hints and general query
      // We run two searches: focused (trusted sites) and general
      const focusedQuery = `${topic} site:amazon.${region} OR site:amazon.in OR site:flipkart.com OR site:apple.com OR site:gsmarena.com OR site:91mobiles.com`;
      let hits = await serpApiSearch(focusedQuery, serpKey, region, 6).catch(() => []);
      if (!hits || hits.length === 0) {
        hits = await serpApiSearch(topic, serpKey, region, 8).catch(() => []);
      }
      sources = hits.slice(0, 12);

      // Count trusted hits
      const trustedCount = sources.filter((s) => isTrustedLink(s.link)).length;
      verification.trustedCount = trustedCount;
      verification.note = trustedCount > 0 ? "Trusted sources found." : "No trusted sources found for this query.";
    } else if (doRetrieve && !serpKey) {
      verification.trustedCount = 0;
      verification.note = "Retrieval was requested but SERPAPI_KEY is not set. Set SERPAPI_KEY to enable live verification.";
    } else {
      verification.trustedCount = 0;
      verification.note = "Retrieval not required for this topic.";
    }

    // Step B: Compose final article
    // If we have sources, create a strict context instructing the model to use only those snippets
    let finalContent = "";
    let needsReview = false;

    if (sources && sources.length > 0) {
      // build snippets context (prioritize trusted links)
      const trusted = sources.filter((s) => isTrustedLink(s.link));
      const chosen = trusted.length ? trusted.slice(0, 6) : sources.slice(0, 6);

      const contextText = chosen
        .map((s, i) => `${i + 1}. ${s.title}\n${s.link}\n${s.snippet || ""}`)
        .join("\n\n");

      const composeSys = `
You are a factual content writer. You have been given ONLY the following web snippets and links as the source of truth.
Use ONLY these snippets to write the article. If a fact (release date, price, availability, or a claim) is not supported by the provided snippets, explicitly write "I could not verify this" for that fact.
Output a final SEO-ready article matching this outline: include the title, a short meta description (single paragraph), and the article body with the headings given in the outline. Include a "Sources" section listing the URLs used.
`;

      const composeUser = [
        `Topic: ${topic}`,
        "",
        `SEO outline (title/meta/outline/faq): ${JSON.stringify(outline)}`,
        "",
        "Verified source snippets (use these only):",
        contextText,
        "",
        "Requirements:",
        "- Start with the SEO title (use outline.title).",
        "- Provide a one-sentence meta description (max 160 chars).",
        "- Follow the outline headings and produce ~700-1500 words depending on the topic complexity.",
        "- Add an FAQ section using outline.faq (short answers).",
        "- End with Sources (list URLs).",
      ].join("\n");

      const composeResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: composeSys },
          { role: "user", content: composeUser },
        ],
        max_tokens: 2000,
        temperature: 0.0,
      });

      finalContent = composeResp?.choices?.[0]?.message?.content ?? composeResp?.choices?.[0]?.text ?? "";
      // If trustedCount is zero, we may want to mark for review
      needsReview = verification.trustedCount === 0;
    } else {
      // No sources (either retrieval disabled or no hits)
      // Generate a cautious SEO article but mark needsReview true if retrieval was suggested but no sources
      const fallbackSys = `
You are an SEO content writer. Produce a cautious, well-structured SEO article for the given outline.
If the topic likely depends on fresh facts or local availability and you are not certain, say "I could not verify this" for uncertain facts.
`;

      const fallbackUser = [
        `Topic: ${topic}`,
        "",
        `SEO outline (title/meta/outline/faq): ${JSON.stringify(outline)}`,
        "",
        "Requirements:",
        "- Use the outline headings.",
        "- Provide a one-sentence meta (160 chars).",
        "- Add FAQ answers from the outline.",
        "- If a claim is time-sensitive or requires live verification, write 'I could not verify this'.",
      ].join("\n");

      const fallbackResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: fallbackSys },
          { role: "user", content: fallbackUser },
        ],
        max_tokens: 1600,
        temperature: 0.0,
      });

      finalContent = fallbackResp?.choices?.[0]?.message?.content ?? fallbackResp?.choices?.[0]?.text ?? "";
      needsReview = doRetrieve && !serpKey; // retrieval needed but not possible
    }

    // Build FAQ array from outline if present (ensure it's an array of objects)
    const faq = Array.isArray(outline.faq)
      ? outline.faq.map((f) => {
          if (typeof f === "string") return { q: f, a: "" };
          if (f && typeof f === "object" && f.q) return { q: f.q, a: f.a || "" };
          return { q: String(f), a: "" };
        })
      : [];

    const responsePayload = {
      title: outline.title || topic,
      meta: outline.meta || "",
      content: finalContent,
      faq,
      sources,
      verification,
      needsReview,
      notes: verification.note || "",
      region,
      retrieved: doRetrieve && Boolean(serpKey),
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate route error:", err);
    return new Response(
      JSON.stringify({
        error: err?.message ?? String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
