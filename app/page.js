// app/generate/page.js
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const demoMode = searchParams?.get("demo") === "1";

  // editor state
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [article, setArticle] = useState("");
  const [score, setScore] = useState(null);
  const textRef = useRef(null);

  useEffect(() => {
    // If demo mode, prefill realistic sample content
    if (demoMode) {
      setTitle("How AI is changing content marketing in 2025");
      setKeywords("AI,content marketing,SEO");
      setLength("medium");
      setArticle(`# How AI is changing content marketing in 2025

The world of content marketing is shifting rapidly thanks to AI... (demo content - editable)

## Key trends

- Faster production cycles
- Better research automation
- Personalised content at scale

## How to use this

1. Edit headlines
2. Regenerate sections
3. Export to WordPress

`);
      // soft UI cue: scroll the editor into view
      setTimeout(() => {
        textRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  const wordCount = (t) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);

  function toast(msg) {
    // minimal toast fallback
    if (typeof window !== "undefined") {
      // attempt a simple transient native-like toast
      const el = document.createElement("div");
      el.textContent = msg;
      el.style.position = "fixed";
      el.style.right = "20px";
      el.style.bottom = "24px";
      el.style.background = "rgba(15,23,36,0.9)";
      el.style.color = "white";
      el.style.padding = "10px 14px";
      el.style.borderRadius = "8px";
      el.style.zIndex = 9999;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    } else {
      // server side fallback (no-op)
    }
  }

  function downloadMarkdown() {
    if (!article) {
      toast("Nothing to download");
      return;
    }
    const blob = new Blob([article], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (title ? title.replace(/\s+/g, "-").toLowerCase() : "article") + ".md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Download started");
  }

  async function copyToClipboard() {
    if (!article) return toast("Nothing to copy");
    try {
      await navigator.clipboard.writeText(article);
      toast("Copied to clipboard");
    } catch {
      toast("Copy failed");
    }
  }

  function generate() {
    if (!title.trim()) return toast("Enter a title or idea");
    setLoading(true);
    setArticle("");
    setProgress(0);
    setScore(null);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 10) + 6;
      if (p >= 98) p = 98;
      setProgress(p);
    }, 200);

    const wait = length === "short" ? 900 : length === "long" ? 4200 : 2400;
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      const kw = keywords ? `\n\n**Keywords:** ${keywords}` : "";
      const body = [
        `# ${title}`,
        "",
        "Quick intro — short summary and hook.",
        "",
        "## Why it matters",
        "A concise paragraph that explains the context and importance.",
        "",
        "## Key points",
        "- Point A\n- Point B\n- Point C",
        "",
        "## How to implement",
        "Step-by-step guidance and examples.",
        "",
        "## Conclusion",
        "Wrap up and CTA.",
      ].join("\n\n");
      const multiplier = length === "short" ? 1 : length === "medium" ? 2 : 3;
      setArticle(Array.from({ length: multiplier }).map(() => body).join("\n\n") + kw);
      const base = 60 + Math.min(28, Math.floor(title.length / 2));
      const bonus = keywords ? 8 : 0;
      const rng = Math.floor(Math.random() * 10);
      setScore(Math.min(98, base + bonus + rng));
      setLoading(false);
    }, wait);
  }

  // small helper to jump to demo sample
  function openDemo() {
    router.push("/generate?demo=1");
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontFamily: "Poppins, Inter", fontWeight: 600 }}>Generate Article</h1>
          <div style={{ color: "#6b7280", marginTop: 6 }}>Enter an idea, choose length, and click generate.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={openDemo} style={{
            padding: "8px 12px",
            borderRadius: 10,
            background: "linear-gradient(90deg,#0b69ff,#00c2ff)",
            color: "white",
            border: "none",
            fontWeight: 700,
            cursor: "pointer"
          }}>Demo</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 360px", gap: 20 }}>
        <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
          {/* top inputs - use more horizontal breathing room */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title or idea" style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)" }} />
            <select value={length} onChange={(e) => setLength(e.target.value)} style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)" }}>
              <option value="short">Short (300–500)</option>
              <option value="medium">Medium (600–900)</option>
              <option value="long">Long (1200–1800)</option>
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Comma-separated keywords (optional)" style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)" }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={generate} disabled={loading} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", fontWeight: 700 }}>
              {loading ? "Generating…" : "Generate Article"}
            </button>
            <button onClick={copyToClipboard} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)", background: "transparent" }}>Copy</button>
            <button onClick={downloadMarkdown} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)", background: "transparent" }}>Download .md</button>
            <div style={{ marginLeft: "auto", color: "#6b7280", alignSelf: "center", fontWeight: 600 }}>Words: <span style={{ fontWeight: 700 }}>{wordCount(article)}</span></div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ color: "#6b7280", marginBottom: 8 }}>Progress: {progress}%</div>
            <div style={{ height: 8, background: "rgba(15,23,36,0.04)", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#ffd86f,#7be29a)", transition: "width 300ms linear" }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Generated article preview</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Edit, copy, or download the markdown.</div>
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{loading ? "Generating" : article ? "Ready" : "Idle"}</div>
            </div>

            <textarea ref={textRef} value={article} onChange={(e) => setArticle(e.target.value)} rows={18}
              style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid rgba(15,23,36,0.06)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", fontSize: 14, lineHeight: 1.6 }} />
          </div>
        </div>

        <aside style={{ position: "sticky", top: 100, alignSelf: "start" }}>
          <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>SEO Score</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>Realtime checks</div>
            </div>

            <div style={{ height: 10, background: "rgba(15,23,36,0.04)", borderRadius: 999, marginTop: 12 }}>
              <div style={{ height: "100%", width: `${score ?? 0}%`, background: "linear-gradient(90deg,#ffd86f,#7be29a)", transition: "width 300ms ease" }} />
            </div>

            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{score ?? "--"}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>{score ? (score >= 80 ? "Excellent" : score >= 65 ? "Good" : "Needs work") : "Generate to evaluate"}</div>

            <div style={{ borderTop: "1px solid rgba(15,23,36,0.04)", paddingTop: 10 }}>
              <div style={{ color: "#6b7280", fontSize: 13 }}>Quick checks</div>
              <ul style={{ marginTop: 8, color: "#6b7280", lineHeight: 1.7 }}>
                <li>• Title length: {title.length > 10 ? "OK" : "Short"}</li>
                <li>• Keywords present: {keywords ? "Yes" : "No"}</li>
                <li>• Word count: {wordCount(article) > 500 ? "Good" : "Low"}</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a href="mailto:support@synapsewrite.io" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", textDecoration: "none", color: "#0f1724", textAlign: "center" }}>Contact support</a>
              <a href="/docs" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(15,23,36,0.06)", textDecoration: "none", color: "#0f1724", textAlign: "center" }}>Docs</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
