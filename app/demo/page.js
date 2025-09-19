// app/demo/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    // redirect to generate with demo param
    router.push("/generate?demo=1");
  }, [router]);

  return (
    <div style={{ maxWidth: 720, margin: "80px auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <h2>Demo — launching editor</h2>
      <p style={{ color: "#6b7280" }}>If you are not redirected automatically, <a href="/generate?demo=1">click here to open the demo</a>.</p>
    </div>
  );
}
