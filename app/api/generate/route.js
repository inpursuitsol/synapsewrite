import OpenAI from "openai";

export async function POST(req) {
  const { topic } = await req.json();

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful content generator." },
        { role: "user", content: `Write a detailed blog article about: ${topic}` }
      ],
      // increased to allow longer articles; adjust up if needed
      max_tokens: 1500,
      temperature: 0.7,
    });

    const content =
      completion?.choices?.[0]?.message?.content ?? "No content returned from model.";

    // Log (server-side) so we can check if API returned full content
    console.log("Generated length:", content.length);

    return new Response(JSON.stringify({ content }), { status: 200 });
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 });
  }
}
