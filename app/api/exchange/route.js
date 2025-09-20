// app/api/exchange/route.js
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiUrl = process.env.EXCHANGE_RATE_API || "https://api.exchangerate.host/latest?base=USD&symbols=INR";
    const r = await fetch(apiUrl, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ error: "failed to fetch rate" }, { status: 502 });
    const j = await r.json();
    const rate = j?.rates?.INR || null;
    return NextResponse.json({ rate });
  } catch (err) {
    console.error("exchange api error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
 
