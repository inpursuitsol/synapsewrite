// app/page.js
export default function Page() {
  return (
    <div className="hp-root">
      <section className="hero">
        <div className="hero-left">
          <div className="kicker">Faster content, better SEO</div>
          <h1 className="title">Turn ideas into publishable articles — elegantly and quickly.</h1>
          <p className="lead">
            SynapseWrite combines a real-time authoring flow with SEO-aware templates so you can produce publish-ready content,
            export to WordPress or Markdown, and ship with confidence.
          </p>

          <div className="ctas">
            <a className="btn primary" href="/generate">Try it free</a>
            <a className="btn secondary" href="https://your-demo-link.example" target="_blank" rel="noreferrer">Watch demo</a>
            <a className="btn outline" href="/generate">Create account</a>
          </div>

          <div className="features">
            <div className="feature-card ai">
              <div className="icon">AI</div>
              <div>
                <div className="f-title">Streaming mode</div>
                <div className="f-sub">Write as content appears — iterate instantly.</div>
              </div>
            </div>

            <div className="feature-card wp">
              <div className="icon">WP</div>
              <div>
                <div className="f-title">Export to WordPress</div>
                <div className="f-sub">One-click export with headings, images, and metadata.</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="hero-right">
          <div className="pricing-card">
            <div className="tier">Starter</div>
            <div className="price">Free • Forever</div>

            <div className="email">support@synapsewrite.io</div>
            <div className="meta">5 users • 5 GB/user • WordPress export</div>

            <div className="pricing-actions">
              <a className="btn primary small" href="/generate">Create account</a>
              <a className="btn outline small" href="mailto:support@synapsewrite.io">Contact sales</a>
            </div>
          </div>
        </aside>
      </section>

      <section className="info-grid">
        <div className="info">
          <h3>What it does</h3>
          <p className="muted">From idea to publishable article — consistent structure, better SEO, faster shipping.</p>
        </div>

        <div className="grid">
          <div className="grid-card">
            <h4>Streaming authoring</h4>
            <p className="muted">Generate sections live while you edit — iterate with speed.</p>
          </div>
          <div className="grid-card">
            <h4>SEO templates</h4>
            <p className="muted">Built-in structure and keyword guidance for each article.</p>
          </div>
          <div className="grid-card">
            <h4>Easy export</h4>
            <p className="muted">Export to WordPress or Markdown with content preserved.</p>
          </div>
        </div>
      </section>

      <style>{`
        /* homepage: Apple-like refined style */
        .hp-root{padding:12px 0 80px}
        .hero{display:flex;gap:28px;align-items:flex-start}
        .hero-left{flex:1;max-width:720px}
        .kicker{display:inline-block;background:rgba(11,105,255,0.08);color:#0b69ff;padding:6px 10px;border-radius:999px;font-weight:700;margin-bottom:12px}
        .title{font-family:Inter,system-ui,-apple-system,Helvetica,Arial;font-size:40px;margin:6px 0 12px;line-height:1.05}
        .lead{color:#374151;font-size:16px;max-width:60ch}

        .ctas{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}
        .btn{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px}
        .btn.primary{background:linear-gradient(90deg,#0b69ff,#00c2ff);color:white;box-shadow:0 10px 30px rgba(11,105,255,0.12)}
        .btn.secondary{background:linear-gradient(180deg,rgba(15,23,36,0.03),rgba(15,23,36,0.02));color:#0f1724;border:1px solid rgba(15,23,36,0.04)}
        .btn.outline{background:transparent;border:1px solid rgba(15,23,36,0.06);color:#0f1724}

        .features{display:flex;gap:14px;margin-top:20px;flex-wrap:wrap}
        .feature-card{display:flex;gap:12px;align-items:center;padding:14px;border-radius:14px;background:white;border:1px solid rgba(15,23,36,0.04);min-width:240px;box-shadow:0 8px 30px rgba(2,6,23,0.04)}
        .feature-card .icon{width:56px;height:56px;border-radius:12px;display:grid;place-items:center;font-weight:800;color:white}
        .feature-card.ai .icon{background:linear-gradient(135deg,#7c5cff,#00c2ff)}
        .feature-card.wp .icon{background:linear-gradient(135deg,#10b981,#34d399)}

        .f-title{font-weight:700}
        .f-sub{color:#6b7280}

        .hero-right{width:320px}
        .pricing-card{background:white;padding:18px;border-radius:14px;border:1px solid rgba(15,23,36,0.04);box-shadow:0 18px 40px rgba(2,6,23,0.06)}
        .tier{color:#6b7280;font-size:13px}
        .price{font-weight:800;margin-top:6px}
        .email{margin-top:12px;font-weight:700}
        .meta{color:#6b7280;margin-top:8px;font-size:13px}
        .pricing-actions{display:flex;gap:10px;margin-top:14px}

        .info-grid{margin-top:36px;display:flex;gap:20px;align-items:flex-start}
        .info{flex:1}
        .grid{display:flex;gap:14px;flex-wrap:wrap}
        .grid-card{background:white;padding:16px;border-radius:12px;border:1px solid rgba(15,23,36,0.04);min-width:220px}
        .muted{color:#6b7280}

        @media (max-width:980px){
          .hero{flex-direction:column}
          .hero-right{width:100%}
          .features{flex-direction:column}
          .info-grid{flex-direction:column}
        }
      `}</style>
    </div>
  );
}
