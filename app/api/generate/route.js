// app/api/generate/route.js
import OpenAI from "openai";

/**
 * Generate route with optional verification via SerpAPI.
 *
 * Behavior:
 * - Produces a structured article (content) and a list of recommended products (if any).
 * - If SERPAPI_KEY is set in env, verifies each product by searching Google (SerpAPI) with gl=in.
 * - Returns JSON: { content: string, products: Array<{ name, reason }>, verification: { [productName]: { verified: bool, sources: [{ title, link, snippet }] } } }
 *
 * Notes:
 * - Needs OPENAI_API_KEY (required) and optional SERPAPI_KEY (for verification).
 * - Keep temperature low for factual outputs.
 */

async function serpApiSearch(query) {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&gl=in&hl=en&num=4&api_key=${encodeURIComponent(
    key
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("SerpAPI request failed:", res.status, await res.text().catch(() => ""));
    return [];
  }
  const j = await res.json();
  // organic_results may contain objects with title, link, snippet
  return j.organic_results?.map((r) => ({
    title: r.title || r.serpapi_link || r.displayed_link || "",
    link: r.link || r.serpapi_link || r.displayed_link || "",
    snippet: r.snippet || r.rich_snippet?.top?.extensions?.join(" ") || "",
  })) || [];
}

function safeJSONParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
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

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const now = new Date().toISOString().slice(0, 10);

    // We ask the model to output a JSON object with "content" (string article) and "products" (array)
    // This helps extract product names reliably for verification.
    const system = `You are a careful, factual article writer for a public blog. ALWAYS include a "Sources" section at the end if possible.
When listing products (like phones), output structured JSON at the end in the following exact format (so it can be parsed):

###
JSON_START
{
  "content": "<full article text as markdown or plain text>",
  "products": [
    { "name": "<product name>", "reason": "<one-line reason for India buyers>" }
  ],
  "sources": "<optional plain text sources block>"
}
JSON_END
###

Important:
- Keep tone factual. Use release month & year when you know it.
- If you cannot verify a fact, write 'I could not verify this' in the article or in the product reason.
- Do not include any other JSON outside the JSON_START/JSON_END block.
- The current date is ${now}. Use it for recency.
`;

    const user = `Write an informative article about: ${topic}.
Requirements:
- Start with a 2-3 sentence summary.
- Recommend relevant products for buyers in India (if topic is about devices), each with a one-line reason.
- At the end include Sources if you used them.
- Then output a JSON block (as described) between JSON_START and JSON_END containing "content" and "products".
Keep temperature low (0.0-0.2).`;

    // Create completion (non-streaming) to reliably parse JSON block
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    });

    const raw = completion?.choices?.[0]?.message?.content ?? completion?.choices?.[0]?.text ?? "";
    // Try to find JSON block between JSON_START and JSON_END
    const startIdx = raw.indexOf("JSON_START");
    const endIdx = raw.indexOf("JSON_END");
    let parsed = null;
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonText = raw.slice(startIdx + "JSON_START".length, endIdx).trim();
      parsed = safeJSONParse(jsonText);
    } else {
      // fallback: sometimes the model returns just JSON without markers
      parsed = safeJSONParse(raw.trim());
    }

    // If parsing failed, try to recover by searching for the first "{"..."}" block
    if (!parsed) {
      const braceStart = raw.indexOf("{");
      const braceEnd = raw.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
        const maybe = raw.slice(braceStart, braceEnd + 1);
        parsed = safeJSONParse(maybe);
      }
    }

    // If still no parsed JSON, return the plain article text (best-effort)
    if (!parsed) {
      // return raw text as content
      return new Response(JSON.stringify({ content: raw, products: [], verification: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const content = parsed.content ?? raw;
    const products = Array.isArray(parsed.products) ? parsed.products : [];

    // If SerpAPI key exists, verify products
    const verification = {};
    if (process.env.SERPAPI_KEY && products.length > 0) {
      for (const p of products) {
        const name = (p.name || "").toString();
        if (!name) continue;
        try {
          // Search queries: "<product name> release date India", "<product name> price India", "<product name> specs"
          const queries = [
            `${name} release date India`,
            `${name} India price`,
            `${name} specs`,
          ];
          // gather top results for each query (deduped)
          const allResults = [];
          for (const q of queries) {
            const hits = await serpApiSearch(q);
            for (const h of hits) {
              if (h.link && !allResults.find((x) => x.link === h.link)) allResults.push(h);
            }
          }
          // simple verification heuristic:
          // if we find at least one official or retail listing (apple.com, flipkart, amazon.in, gsmarena, 91mobiles), mark as likely verified
          const domainSignals = ["apple.com", "flipkart.com", "amazon.in", "gsmarena.com", "91mobiles.com", "ndtv.com", "theverge.com", "gsmarena.com"];
          const matched = allResults.filter((r) => domainSignals.some((d) => (r.link || "").includes(d)));
          const verified = matched.length > 0;
          verification[name] = {
            verified,
            sources: (matched.length > 0 ? matched : allResults.slice(0, 6)).map((r) => ({
              title: r.title || r.link,
              link: r.link,
              snippet: r.snippet || "",
            })),
          };
        } catch (err) {
          console.warn("Verification error for", p.name, err?.message ?? err);
          verification[p.name] = { verified: false, sources: [] };
        }
      }
    }

    // Return structured JSON
    return new Response(JSON.stringify({ content, products, verification }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Route error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
