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
      max_tokens: 500,
    });

    return new Response(
      JSON.stringify({ content: completion.choices[0].message.content }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
