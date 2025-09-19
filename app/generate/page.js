// app/generate/page.js
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const demoMode = searchParams?.get("demo") === "1";

  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [article, setArticle] = useState("");
  const [score, setScore] = useState(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (demoMode) {
      setTitle("How AI is changing content marketing in 2025");
      setKeywords("AI,content marketing,SEO");
      setLength("medium");
      setArticle(`# How AI is changing content marketing in 2025

The world of content marketing is shifting rapidly thanks to AI...

## Key trends
- Faster production cycles
- Better research automation
- Personalized content at scale

## How to use this
1. Edit headlines
2. Regenerate sections
3. Export to WordPress
`);
      setTimeout(() => textRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  const wordCount = (t) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);

  function toast(msg) {
    if (typeof window !== "undefined") {
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
      setTimeout(() => el.remove(), 2200);
    }
  }

  function downloadMarkdown() {
    if (!article) return toast("Nothing to download");
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

  function openDemo() {
    router.push("/generate?demo=1");
  }

  return (
    <div className="generate-root">
      <div className="generate-head">
        <div>
          <h1 className="gen-title">Generate Article</h1>
          <div className="gen-sub">Enter an idea, choose length, and click generate.</div>
        </div>

        <div className="head-actions">
          <button onClick={openDemo} className="btn demo">Demo</button>
        </div>
      </div>

      <div className="generate-grid">
        <div className="editor-card">
          <div className="inputs-row">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title or idea" className="input title" />
            <select value={length} onChange={(e) => setLength(e.target.value)} className="input select">
              <option value="short">Short (300–500)</option>
              <option value="medium">Medium (600–900)</option>
              <option value="long">Long (1200–1800)</option>
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Comma-separated keywords (optional)" className="input full" />
          </div>

          <div className="actions-row">
            <button onClick={generate} disabled={loading} className="primary-btn">{loading ? "Generating…" : "Generate Article"}</button>
            <button onClick={copyToClipboard} className="ghost-btn">Copy</button>
            <button onClick={downloadMarkdown} className="ghost-btn">Download .md</button>
            <div className="wordcount">Words: <strong>{wordCount(article)}</strong></div>
          </div>

          <div className="progress-wrap">
            <div className="progress-label">Progress: {progress}%</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="preview-head">
            <div>
              <div className="preview-title">Generated article preview</div>
              <div className="preview-sub">Edit, copy, or download the markdown.</div>
            </div>
            <div className="preview-status">{loading ? "Generating" : article ? "Ready" : "Idle"}</div>
          </div>

          <textarea ref={textRef} value={article} onChange={(e) => setArticle(e.target.value)} className="editor-text" rows={20} />
        </div>

        <aside className="sidebar">
          <div className="seo-card">
            <div className="seo-head">
              <div className="seo-title">SEO Score</div>
              <div className="seo-sub">Realtime checks</div>
            </div>

            <div className="seo-bar">
              <div className="seo-fill" style={{ width: `${score ?? 0}%` }} />
            </div>

            <div className="score-large">{score ?? "--"}</div>
            <div className="score-desc">{score ? (score >= 80 ? "Excellent" : score >= 65 ? "Good" : "Needs work") : "Generate to evaluate"}</div>

            <div className="quick-checks">
              <ul>
                <li>Title length: {title.length > 10 ? "OK" : "Short"}</li>
                <li>Keywords present: {keywords ? "Yes" : "No"}</li>
                <li>Word count: {wordCount(article) > 500 ? "Good" : "Low"}</li>
              </ul>
            </div>

            <div className="side-actions">
              <a href="mailto:support@synapsewrite.io" className="side-btn">Contact support</a>
              <a href="/docs" className="side-btn">Docs</a>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Poppins:wght@600;700&display=swap');

        .generate-root { max-width: 1440px; margin: 0 auto; padding: 28px 22px 80px; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; color: #0f1724; }
        .generate-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:20px; gap: 20px; }
        .gen-title { margin:0; font-family: Poppins, Inter; font-weight:600; font-size:28px; }
        .gen-sub { color:#6b7280; margin-top:6px; }

        .head-actions { display:flex; gap:12px; }
        .btn.demo { background: linear-gradient(90deg,#0b69ff,#00c2ff); color:white; border:none; padding:8px 12px; border-radius:10px; font-weight:700; cursor:pointer; }

        /* grid - give left editor more space */
        .generate-grid { display:grid; grid-template-columns: 1.8fr 360px; gap: 26px; align-items:start; }

        .editor-card { background: white; padding: 20px; border-radius:12px; border:1px solid rgba(15,23,36,0.04); }
        .inputs-row { display:grid; grid-template-columns: 1fr 220px; gap:12px; }

        .input { padding:14px; border-radius:10px; border:1px solid rgba(15,23,36,0.06); font-size:15px; }
        .input.title { font-weight:600; }
        .input.select { background:white; }
        .input.full { width:100%; }

        .actions-row { display:flex; gap:10px; align-items:center; margin-top:14px; flex-wrap:wrap; }
        .primary-btn { background: linear-gradient(90deg,#0b69ff,#00c2ff); color:white; border:none; padding:12px 16px; border-radius:10px; font-weight:700; cursor:pointer; }
        .ghost-btn { background:transparent; border:1px solid rgba(15,23,36,0.06); padding:10px 14px; border-radius:10px; cursor:pointer; }
        .wordcount { margin-left:auto; color:#6b7280; font-weight:600; }

        .progress-wrap { margin-top:14px; }
        .progress-label { color:#6b7280; margin-bottom:8px; }
        .progress-bar { height:10px; background:rgba(15,23,36,0.04); border-radius:999px; overflow:hidden; }
        .progress-fill { height:100%; background:linear-gradient(90deg,#ffd86f,#7be29a); transition: width 280ms linear; }

        .preview-head { display:flex; justify-content:space-between; align-items:flex-start; margin-top:16px; margin-bottom:8px; }
        .preview-title { font-weight:700; }
        .preview-sub { color:#6b7280; font-size:13px; margin-top:4px; }
        .preview-status { color:#6b7280; font-size:13px; }

        .editor-text { width:100%; padding:16px; border-radius:10px; border:1px solid rgba(15,23,36,0.06); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; font-size:15px; line-height:1.7; min-height:420px; resize:vertical; }

        /* sidebar */
        .sidebar { position: sticky; top: 92px; align-self:start; }
        .seo-card { background:white; padding:16px; border-radius:12px; border:1px solid rgba(15,23,36,0.04); width:100%; }
        .seo-head { display:flex; justify-content:space-between; align-items:center; }
        .seo-title { font-weight:700; }
        .seo-sub { color:#6b7280; font-size:13px; }
        .seo-bar { height:10px; background:rgba(15,23,36,0.04); border-radius:999px; margin-top:12px; overflow:hidden; }
        .seo-fill { height:100%; background:linear-gradient(90deg,#ffd86f,#7be29a); transition: width 300ms ease; }
        .score-large { font-weight:800; font-size:22px; margin-top:8px; }
        .score-desc { color:#6b7280; font-size:13px; margin-bottom:10px; }

        .quick-checks ul { margin:0; padding-left:18px; color:#6b7280; line-height:1.7; }
        .side-actions { display:flex; gap:8px; margin-top:12px; }
        .side-btn { flex:1; text-align:center; padding:10px; border-radius:8px; border:1px solid rgba(15,23,36,0.06); text-decoration:none; color:#0f1724; }

        /* responsive */
        @media (max-width:1100px) {
          .generate-grid { grid-template-columns: 1fr; }
          .sidebar { position: static; }
        }
      `}</style>
    </div>
  );
}
