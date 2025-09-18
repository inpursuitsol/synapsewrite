"use client";

import React from "react";

export default function Page() {
  return (
    <div className="sw-root">
      <header className="sw-header">
        <div className="sw-brand">
          <div className="sw-logo">SW</div>
          <div>
            <div className="sw-title">SynapseWrite</div>
            <div className="sw-sub">AI article generator</div>
          </div>
        </div>

        <nav className="sw-nav">
          <a href="/generate" className="sw-link">Features</a>
          <a href="/generate" className="sw-link">Pricing</a>
          {/* Replace the demo link below with your real Loom/YouTube URL */}
          <a href="https://your-demo-link.example" className="sw-link" target="_blank" rel="noreferrer">Demo</a>
          <a href="mailto:support@synapsewrite.io" className="sw-cta">Contact</a>
        </nav>
      </header>

      <main className="sw-hero">
        <div className="sw-hero-left">
          <div className="sw-badge">Faster content, better SEO</div>
          <h1 className="sw-h1">Turn ideas into long-form articles in minutes — with human quality.</h1>
          <p className="sw-lead">
            SynapseWrite uses a streaming authoring flow and SEO-aware templates so you can produce publish-ready articles,
            outlines, or blog series. Export to WordPress or Markdown and ship faster.
          </p>

          <div className="sw-actions">
            <a href="/generate" className="sw-btn primary">Try it free</a>
            <a href="https://your-demo-link.example" className="sw-btn" target="_blank" rel="noreferrer">Watch demo</a>
            <a href="/generate" className="sw-btn">Create account</a>
          </div>

          <div className="sw-cards">
            <div className="sw-card">
              <div className="sw-card-icon">AI</div>
              <div>
                <div className="sw-card-title">Streaming mode</div>
                <div className="sw-muted">Write while content generates</div>
              </div>
            </div>

            <div className="sw-card">
              <div className="sw-card-icon">WP</div>
              <div>
                <div className="sw-card-title">Export to WordPress</div>
                <div className="sw-muted">One-click export & Markdown</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="sw-panel">
          <div className="sw-panel-top">
            <div className="sw-small-muted">Starter</div>
            <div className="sw-price">Free • Forever</div>
          </div>

          <div className="sw-panel-email">support@synapsewrite.io</div>
          <div className="sw-small-muted">5 users • 5 GB/user • WordPress export • SEO score</div>

          <div className="sw-panel-actions">
            <a href="/generate" className="sw-btn primary small">Create account</a>
            <a href="mailto:support@synapsewrite.io" className="sw-btn small">Contact sales</a>
          </div>
        </aside>
      </main>

      <section id="features" className="sw-features">
        <h2>What it does</h2>
        <p className="sw-muted">From brief to publishable article — faster and more consistent.</p>

        <div className="sw-grid">
          <div className="sw-feature">
            <h4>Streaming authoring</h4>
            <p className="sw-muted">Generate sections live while you edit — reduces waiting and improves iteration speed.</p>
          </div>
          <div className="sw-feature">
            <h4>SEO-aware templates</h4>
            <p className="sw-muted">Built-in keyword & structure guidance so each article is optimized for search.</p>
          </div>
          <div className="sw-feature">
            <h4>Easy export</h4>
            <p className="sw-muted">Export to WordPress or Markdown with images, headings, and metadata preserved.</p>
          </div>
        </div>
      </section>

      <section className="sw-cta-block">
        <div>
          <div className="sw-cta-title">Ready to ship content faster?</div>
          <div className="sw-muted">Create your free workspace and start publishing today.</div>
        </div>

        <div className="sw-cta-actions">
          <a href="/generate" className="sw-btn primary">Sign up free</a>
          <a href="https://your-demo-link.example" target="_blank" rel="noreferrer" className="sw-btn">Live demo</a>
        </div>
      </section>

      <footer className="sw-footer">
        <div>
          <div className="sw-title">SynapseWrite</div>
          <div className="sw-muted">Made for creators — support@synapsewrite.io</div>
        </div>
        <div className="sw-muted">© 2025 SynapseWrite</div>
      </footer>

      <style>{`
        /* Simple no-Tailwind styling for app/page.js */
        .sw-root{font-family:Inter,system-ui,Arial,sans-serif;color:#eef2f7;background:linear-gradient(180deg,#071021,#04101a);padding:28px;min-height:100vh;}
        .sw-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
        .sw-brand{display:flex;align-items:center;gap:12px;font-weight:700}
        .sw-logo{width:48px;height:48px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#7c5cff,#00d4ff);color:#021;font-weight:800}
        .sw-title{font-size:16px}
        .sw-sub{font-size:12px;color:#9aa8bd;margin-top:2px}
        .sw-nav{display:flex;gap:12px;align-items:center}
        .sw-link{color:#9aa8bd;text-decoration:none;padding:8px}
        .sw-cta{background:#7c5cff;color:#021;padding:8px 12px;border-radius:10px;text-decoration:none}
        .sw-hero{display:flex;gap:24px;align-items:flex-start;margin-bottom:28px;flex-wrap:wrap}
        .sw-hero-left{flex:1;min-width:300px}
        .sw-panel{width:320px;min-width:280px}
        .sw-badge{display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(124,92,255,0.08);color:#cdbbff;font-weight:700}
        .sw-h1{font-size:32px;margin:14px 0 10px}
        .sw-lead{color:#9aa8bd;max-width:58ch}
        .sw-actions{margin-top:16px;display:flex;gap:10px;flex-wrap:wrap}
        .sw-btn{display:inline-block;padding:10px 14px;border-radius:10px;background:transparent;border:1px solid rgba(255,255,255,0.06);color:#eef2f7;text-decoration:none;font-weight:700}
        .sw-btn.primary{background:linear-gradient(90deg,#7c5cff,#00d4ff);color:#021;border:none}
        .sw-cards{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}
        .sw-card{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,0.03);padding:10px;border-radius:10px}
        .sw-card-icon{width:56px;height:56px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#7c5cff,#00d4ff);font-weight:800;color:#021}
        .sw-card-title{font-weight:700}
        .sw-muted{color:#9aa8bd;font-size:13px}
        .sw-panel{background:rgba(255,255,255,0.03);padding:16px;border-radius:12px}
        .sw-panel-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .sw-small-muted{color:#9aa8bd;font-size:12px}
        .sw-price{font-weight:800}
        .sw-panel-email{font-weight:700;margin-bottom:6px}
        .sw-panel-actions{display:flex;gap:8px;margin-top:12px}
        .sw-features{margin-top:22px}
        .sw-grid{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}
        .sw-feature{flex:1;min-width:220px;background:rgba(255,255,255,0.02);padding:12px;border-radius:10px}
        .sw-cta-block{display:flex;justify-content:space-between;align-items:center;padding:16px;border-radius:10px;margin-top:24px;background:linear-gradient(90deg,rgba(124,92,255,0.06),rgba(0,212,255,0.03))}
        .sw-cta-actions{display:flex;gap:8px}
        .sw-footer{display:flex;justify-content:space-between;align-items:center;margin-top:28px;border-top:1px solid rgba(255,255,255,0.02);padding-top:14px}
        @media (max-width:900px){ .sw-hero{flex-direction:column} .sw-panel{width:100%} .sw-nav{display:none} }
      `}</style>
    </div>
  );
}
