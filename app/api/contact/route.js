// app/api/contact/route.js
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, message } = body;
    if (!email || !message) return NextResponse.json({ error: "missing" }, { status: 400 });

    const item = { name: name || "", email, message, ts: new Date().toISOString() };

    try {
      const filePath = path.join("/tmp", "sw_contacts.json");
      let existing = [];
      if (fs.existsSync(filePath)) existing = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
      existing.unshift(item);
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
      console.log("Saved contact (demo):", item);
    } catch (e) {
      console.warn("Unable to persist contact to /tmp:", e.message);
    }

    // TODO: send to SendGrid/Airtable/Supabase — instructions below.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
