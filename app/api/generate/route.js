// app/api/generate/route.js
import OpenAI from "openai";

/**
 * Dynamic generate route (RAG-ish):
 * - If SERPAPI_KEY is present, searches Google (via SerpAPI) restricted to India (gl=in)
 *   and collects top organic results (title, link, snippet).
 * - Feeds those snippets to the model with a strict system prompt that forbids hallucination
 *   and instructs the model to "use only the provided sources".
 * - Returns JSON: { content: string, sources: [{title,link,snippet}], note: "" }
 *
 * Notes:
 * - Requires OPENAI_API_KEY env in Vercel.
 * - Optional SERPAPI_KEY env in Vercel. If set, verification/search will run (recommended).
 * - Keep temperature low to favor factual outputs.
 */

async function serpApiSearch(query, serpKey, num = 6) {
  if (!serpKey) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&gl=in&hl=en&num=${num}&api_key=${encodeURIComponent(
    serpKey
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("SerpAPI failed:", res.status, await res.text().catch(() => ""));
    return [];
  }
  const j = await res.json();
  const hits = (j.organic_results || []).map((r) => ({
    title: r.title || r.link || "",
    link: r.link || r.displayed_link || "",
    snippet: r.snippet || (r.rich_snippet?.top?.extensions || []).join(" ") || "",
  }));
  // Deduplicate links
  const uniq = [];
  const seen = new Set();
  for (const h of hits) {
    if (!h.link) continue;
    if (seen.has(h.link)) continue;
    seen.add(h.link);
    uniq.push(h);
    if (uniq.length >= num) break;
  }
  return uniq;
}

function officialDomainScore(link = "") {
  const domainSignals = [
    "apple.com",
    "flipkart.com",
    "amazon.in",
    "gsmarena.com",
    "91mobiles.com",
    "ndtv.com",
    "theverge.com",
    "techradar.com",
  ];
  const l = (link || "").toLowerCase();
  return domainSignals.some((d) => l.includes(d));
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = (body?.topic || "").toString().trim();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Missing 'topic' in request body." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const serpKey = process.env.SERPAPI_KEY || "";
    let sources = [];
    let note = "";

    // If SERPAPI_KEY present, try to collect authoritative snippets
    if (serpKey) {
      // Build a focused query that favors official retailers / Apple India and trusted review sites
      const focusedQuery = `${topic} site:apple.com OR site:flipkart.com OR site:amazon.in OR site:gsmarena.com OR site:91mobiles.com`;
      try {
        const hits = await serpApiSearch(focusedQuery, serpKey, 6);
        // If we didn't get useful hits from the focused query, fall back to generic query
        if (!hits || hits.length === 0) {
          const fallbackHits = await serpApiSearch(topic, serpKey, 6);
          sources = fallbackHits;
        } else {
          sources = hits;
        }
      } catch (err) {
        console.warn("SerpAPI search error:", err?.message ?? err);
        sources = [];
      }
      if (sources.length === 0) {
        note = "No web sources found for this topic (SerpAPI returned no hits). Generation will proceed without live verification.";
      }
    } else {
      // No SERPAPI_KEY provided
      note = "SERPAPI_KEY not set — generation will run without live web verification. Add SERPAPI_KEY in Vercel to enable live checks.";
    }

    // Build a context string from collected sources (if any)
    const sourcesText = (sources || [])
      .map((s, i) => `${i + 1}. ${s.title}\n${s.link}\n${s.snippet || ""}`)
      .join("\n\n");

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Strong system prompt: must use only provided sources, do not hallucinate
    const sysPrompt = `
You are a careful, factual article writer for a public-facing blog. You must only use the provided web snippets and links when producing factual claims.
- If the required fact (e.g., release date, availability) is not present in the provided sources, explicitly say "I could not verify this fact" rather than inventing it.
- At the end include a "Sources" section listing the exact URLs used.
- Produce a clear, neutral, buyer-friendly article for the topic below.
- If no sources are provided, say so and provide a cautious general answer, marking uncertain claims with "I could not verify".
- Output should be plain text (Markdown is fine).
Current date: ${new Date().toISOString().slice(0, 10)}.
`;

    // User prompt: include sources as context
    const userPromptParts = [
      `Topic: ${topic}`,
      "",
      `Context: The following web search results (titles, links, snippets) were collected for this topic (India-focused). Use them to verify claims and write the article. Do NOT use external facts beyond these snippets unless you explicitly state you could not verify.`,
      "",
      sourcesText ? `Sources:\n\n${sourcesText}` : "No web snippets provided.",
      "",
      `Requirements:
- Start with a 2-3 sentence summary.
- If the topic is about products (phones), list recommended models in India and for each include release month & year if found in sources, short pros/cons, and the specific link(s) you used as evidence.
- Include a "Sources" section with the clickable URLs.
- If you cannot verify a fact, write "I could not verify this" for that fact.
- Tone: factual, neutral.`,
    ];

    const messages = [
      { role: "system", content: sysPrompt },
      { role: "user", content: userPromptParts.join("\n") },
    ];

    // Call the model (single completion, low temperature)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 2000,
      temperature: 0.0,
    });

    const rawOutput = completion?.choices?.[0]?.message?.content ?? completion?.choices?.[0]?.text ?? "";

    // Build verification summary: mark as "official" if at least one official domain matched
    const hasOfficial = (sources || []).some((s) => officialDomainScore(s.link));
    const verificationSummary = {
      verifiedBySearch: hasOfficial,
      sourcesCount: sources.length,
      note,
    };

    // Return the article text plus the sources we collected and a small verification summary
    return new Response(
      JSON.stringify({
        content: rawOutput,
        sources: sources || [],
        verification: verificationSummary,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Route error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
