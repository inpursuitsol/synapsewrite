"use client";

import React from "react";

export default function Page() {
  return (
    <div className="sw-root">
      <header className="sw-header">
        <div className="sw-brand">
          <a href="/" className="sw-logo">SW</a>
          <div>
            <div className="sw-name">SynapseWrite</div>
            <div className="sw-sub">AI article generator</div>
          </div>
        </div>

        <nav className="sw-nav">
          <a href="/generate" className="sw-link">Features</a>
          <a href="/generate" className="sw-link">Pricing</a>
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
            <a href="https://your-demo-link.example" className="sw-btn secondary" target="_blank" rel="noreferrer">Watch demo</a>
            <a href="/generate" className="sw-btn outline">Create account</a>
          </div>

          <div className="sw-cards">
            <div className="sw-card sw-card-ai" aria-hidden>
              <div className="sw-card-icon">AI</div>
              <div>
                <div className="sw-card-title">Streaming mode</div>
                <div className="sw-muted">Write while content generates</div>
              </div>
            </div>

            <div className="sw-card sw-card-wp" aria-hidden>
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
            <a href="mailto:support@synapsewrite.io" className="sw-btn outline small">Contact sales</a>
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
          <a href="https://your-demo-link.example" target="_blank" rel="noreferrer" className="sw-btn secondary">Live demo</a>
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
        /* Refined UI: distinct buttons & feature cards */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Poppins:wght@600;700&display=swap');

        :root{
          --bg:#06111a;
          --muted:#93a0b8;
          --accent-1:#7c5cff; /* purple */
          --accent-2:#00d4ff; /* cyan */
          --accent-3:#2dd4bf; /* teal for WP */
          --accent-4:#34d399; /* green */
          --white:#edf2f9;
        }
        *{box-sizing:border-box}
        body{margin:0;background:linear-gradient(180deg,#071021,#04101a);font-family:Inter,system-ui,Arial;color:var(--white);-webkit-font-smoothing:antialiased}
        .sw-root{max-width:1200px;margin:0 auto;padding:34px}

        /* Header */
        .sw-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .sw-brand{display:flex;gap:12px;align-items:center}
        .sw-logo{width:48px;height:48px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent-1),var(--accent-2));color:#021;font-weight:800;text-decoration:none}
        .sw-name{font-weight:700;font-size:16px}
        .sw-sub{font-size:13px;color:var(--muted)}

        .sw-nav{display:flex;gap:12px;align-items:center}
        .sw-nav-link{color:var(--muted);text-decoration:none;padding:6px 10px;border-radius:8px}
        .sw-cta{background:linear-gradient(90deg,var(--accent-1),var(--accent-2));color:#021;padding:8px 12px;border-radius:8px;text-decoration:none;font-weight:700}

        /* Hero */
        .sw-hero{display:flex;gap:28px;align-items:flex-start;margin-bottom:28px}
        .sw-hero-left{flex:1}
        .sw-badge{display:inline-block;padding:6px 12px;border-radius:999px;background:linear-gradient(90deg,rgba(124,92,255,0.08),rgba(0,212,255,0.04));color:var(--accent-1);font-weight:700}
        .sw-h1{font-size:34px;margin:14px 0 10px;font-family:Poppins, Inter, sans-serif}
        .sw-lead{color:var(--muted);max-width:60ch}

        /* Buttons */
        .sw-actions{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap}
        .sw-btn{display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);text-decoration:none;font-weight:700;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
        .sw-btn:hover{transform:translateY(-3px)}
        .sw-btn:active{transform:translateY(-1px)}

        .sw-btn.primary{background:linear-gradient(90deg,var(--accent-1),var(--accent-2));color:#021;border:none;box-shadow:0 8px 24px rgba(124,92,255,0.12)}
        .sw-btn.secondary{background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));color:var(--white);border:1px solid rgba(255,255,255,0.04)}
        .sw-btn.outline{background:transparent;color:var(--white);border:1px solid rgba(255,255,255,0.06);opacity:0.95}
        .sw-btn.small{padding:8px 10px;border-radius:10px;font-size:14px}

        /* Feature cards */
        .sw-cards{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}
        .sw-card{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:12px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.03);transition:transform .18s ease,box-shadow .18s ease}
        .sw-card:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(2,6,23,0.6)}
        .sw-card-icon{width:56px;height:56px;border-radius:12px;display:grid;place-items:center;font-weight:800;color:#021}

        /* AI card style */
        .sw-card-ai .sw-card-icon{background:linear-gradient(135deg,var(--accent-1),var(--accent-2));box-shadow:0 8px 24px rgba(124,92,255,0.12)}
        .sw-card-ai .sw-card-title{color:var(--white)}

        /* WP card style */
        .sw-card-wp .sw-card-icon{background:linear-gradient(135deg,var(--accent-3),var(--accent-4));box-shadow:0 8px 24px rgba(34,197,94,0.09)}
        .sw-card-wp .sw-card-title{color:var(--white)}

        .sw-card-title{font-weight:700}
        .sw-muted{color:var(--muted);font-size:13px}

        /* Right panel */
        .sw-panel{width:320px;min-width:260px;background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.01));padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.03);box-shadow:0 12px 30px rgba(2,6,23,0.5)}
        .sw-panel-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .sw-small-muted{color:var(--muted);font-size:13px}
        .sw-price{font-weight:800}
        .sw-panel-email{font-weight:700;margin-bottom:6px}
        .sw-panel-actions{display:flex;gap:8px;margin-top:12px}

        /* Features grid and footer */
        .sw-features{margin-top:22px}
        .sw-grid{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}
        .sw-feature{flex:1;min-width:220px;background:rgba(255,255,255,0.02);padding:12px;border-radius:10px}
        .sw-cta-block{display:flex;justify-content:space-between;align-items:center;padding:16px;border-radius:10px;margin-top:24px;background:linear-gradient(90deg,rgba(124,92,255,0.04),rgba(0,212,255,0.02))}
        .sw-cta-actions{display:flex;gap:8px}

        .sw-footer{display:flex;justify-content:space-between;align-items:center;margin-top:28px;border-top:1px solid rgba(255,255,255,0.02);padding-top:14px;color:var(--muted);font-size:13px}

        @media (max-width:900px){
          .sw-hero{flex-direction:column}
          .sw-panel{width:100%}
          .sw-nav{display:none}
          .sw-cards{flex-direction:column}
        }
      `}</style>
    </div>
  );
}
