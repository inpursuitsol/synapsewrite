// app/api/signup/route.js
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, company } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), { status: 400 });
    }

    const lead = {
      name: name || "",
      email,
      company: company || "",
      ts: new Date().toISOString(),
    };

    // Temporary demo persistence: append to /tmp/sw_leads.json
    try {
      const filePath = path.join("/tmp", "sw_leads.json");
      let existing = [];
      if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
      }
      existing.unshift(lead);
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
      console.log("Lead saved (demo):", lead);
    } catch (err) {
      console.warn("Failed to persist to /tmp (serverless ephemeral):", err.message);
      // still continue
    }

    // TODO: Replace with real provider (SendGrid, Supabase, Airtable, etc.)

    return new Response(JSON.stringify({ success: true, lead }), { status: 200 });
  } catch (err) {
    console.error("signup api error", err);
    return new Response(JSON.stringify({ error: "server error" }), { status: 500 });
  }
}
