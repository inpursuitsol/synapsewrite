// app/page.js
export default function Page() {
  return (
    <div className="hp-root">
      <section className="hero">
        <div className="hero-left">
          <div className="kicker">Faster content. Better SEO.</div>

          <h1 className="title">Turn ideas into publishable articles — beautifully and fast.</h1>

          <p className="lead">
            SynapseWrite combines a real-time authoring flow with SEO-aware templates so you can produce publish-ready content,
            export to WordPress or Markdown, and ship with confidence.
          </p>

          <div className="ctas">
            {/* Primary CTA: Create account (conversion) */}
            <a className="btn primary" href="/signup">Create account</a>

            {/* Secondary CTA: Demo/try — lower emphasis, external or route */}
            <a className="btn secondary" href="https://your-demo-link.example" target="_blank" rel="noreferrer">Watch demo</a>
          </div>

          <div className="features">
            <a className="feature-card ai" href="/features/streaming" title="Streaming authoring">
              <div className="icon">AI</div>
              <div>
                <div className="f-title">Streaming mode</div>
                <div className="f-sub">Write while content generates — iterate instantly.</div>
              </div>
            </a>

            <a className="feature-card wp" href="/features/export" title="Export to WordPress">
              <div className="icon">WP</div>
              <div>
                <div className="f-title">Export to WordPress</div>
                <div className="f-sub">One-click export with headings, images, and metadata.</div>
              </div>
            </a>
          </div>
        </div>

        <aside className="hero-right">
          <div className="pricing-card">
            <div className="tier">Starter</div>
            <div className="price">Free • Forever</div>

            <div className="email">support@synapsewrite.io</div>
            <div className="meta">5 users • 5 GB/user • WordPress export</div>

            <div className="pricing-actions">
              {/* Keep the panel small and non-redundant: only one button that complements the hero */}
              <a className="btn outline small" href="mailto:support@synapsewrite.io">Contact sales</a>
            </div>
          </div>
        </aside>
      </section>

      <section className="info-grid">
        <div className="left-label">
          <h3 className="left-title">What it does</h3>
          <p className="left-sub">From idea to publishable article — consistent structure, better SEO, faster shipping.</p>
        </div>

        <div className="right-cards">
          <div className="card-row">
            <div className="grid-card">
              <h4>Streaming authoring</h4>
              <p className="muted">Generate sections live while you edit — iterate at speed.</p>
            </div>
            <div className="grid-card">
              <h4>SEO templates</h4>
              <p className="muted">Built-in structure and keyword guidance for each article.</p>
            </div>
          </div>

          <div className="card-row">
            <div className="grid-card">
              <h4>Easy export</h4>
              <p className="muted">Export to WordPress or Markdown with content preserved.</p>
            </div>
            <div className="grid-card empty" />
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Poppins:wght@600;700&display=swap');

        .hp-root{padding:12px 0 80px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#0f1724; max-width:1260px;margin:0 auto}
        .hero{display:flex;gap:28px;align-items:flex-start;margin-bottom:36px}
        .hero-left{flex:1;max-width:760px}
        .kicker{display:inline-block;color:#0b69ff;padding:6px 10px;border-radius:999px;font-weight:700;margin-bottom:12px;font-family:Poppins,Inter}
        .title{font-family:Poppins, Inter;font-size:44px;margin:6px 0 12px;line-height:1.02}
        .lead{color:#374151;font-size:18px;line-height:1.6;max-width:70ch;margin-top:6px}

        .ctas{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}
        .btn{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px}
        .btn.primary{background:linear-gradient(90deg,#0b69ff,#00c2ff);color:white;box-shadow:0 18px 40px rgba(11,105,255,0.12)}
        .btn.secondary{background:transparent;border:1px solid rgba(15,23,36,0.06);color:#0f1724}
        .btn.outline{background:transparent;border:1px solid rgba(15,23,36,0.06);color:#0f1724}
        .btn.small{padding:8px 10px;border-radius:10px}

        .features{display:flex;gap:14px;margin-top:20px;flex-wrap:wrap}
        .feature-card{display:flex;gap:12px;align-items:center;padding:14px;border-radius:14px;background:white;border:1px solid rgba(15,23,36,0.04);min-width:260px;box-shadow:0 8px 30px rgba(2,6,23,0.04);text-decoration:none;color:inherit}
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

        .info-grid{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start;margin-top:34px}
        .left-label{padding-top:6px}
        .left-title{font-family:Poppins, Inter;font-size:18px;margin:0 0 8px}
        .left-sub{color:#6b7280;margin:0;font-size:15px;line-height:1.6}

        .right-cards{display:flex;flex-direction:column;gap:16px}
        .card-row{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
        .grid-card{background:white;padding:20px;border-radius:12px;border:1px solid rgba(15,23,36,0.04);min-height:90px;box-shadow:0 12px 36px rgba(2,6,23,0.04)}
        .grid-card h4{margin:0 0 8px;font-family:Poppins,Inter;font-size:16px}
        .grid-card p{margin:0;color:#6b7280}

        .grid-card.empty{background:transparent;border:none;box-shadow:none}

        .muted{color:#6b7280}

        @media (max-width:980px){
          .hero{flex-direction:column}
          .hero-right{width:100%}
          .info-grid{grid-template-columns:1fr;gap:16px}
          .left-label{order:1}
          .right-cards{order:2}
          .card-row{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}
