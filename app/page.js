// app/page.js
export default function LandingPage() {
  return (
    <div className="landing-root">
      <header className="hero-outer" role="banner">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="eyebrow">SynapseWrite</div>
            <h1 className="heading">Turn ideas into publishable articles — beautifully and fast.</h1>
            <p className="sub">
              A streaming authoring flow + SEO-aware templates so you can produce publish-ready content, export to WordPress or Markdown,
              and ship with confidence.
            </p>

            <div className="hero-ctas">
              <a className="cta-primary" href="/generate">Try it free</a>
              <a className="cta-secondary" href="/demo" target="_blank" rel="noreferrer">Watch demo</a>
            </div>

            <div className="trust">
              <div className="trust-pill">Export to WordPress</div>
              <div className="trust-pill">Streaming authoring</div>
              <div className="trust-pill">SEO templates</div>
            </div>
          </div>

          <div className="hero-right" aria-hidden>
            {/* Elegant, minimal product mock — not interactive, just visual */}
            <div className="mock">
              <div className="mock-top">
                <div className="mock-title">Generate Article</div>
                <div className="mock-badge">Demo</div>
              </div>

              <div className="mock-body">
                <div className="mock-inputrow">
                  <div className="mock-input short" />
                  <div className="mock-input small" />
                </div>
                <div className="mock-input" />
                <div className="mock-buttons">
                  <div className="mock-btn primary" />
                  <div className="mock-btn" />
                </div>

                <div className="mock-article">
                  <div className="mock-line short" />
                  <div className="mock-line" />
                  <div className="mock-line" />
                  <div className="mock-line long" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="features" aria-labelledby="features-heading">
        <div className="features-inner">
          <h2 id="features-heading" className="features-title">What you can do</h2>

          <div className="grid">
            <article className="card">
              <h3>Streaming authoring</h3>
              <p>Generate sections live while you edit — iterate at speed with granular control.</p>
            </article>

            <article className="card">
              <h3>SEO templates</h3>
              <p>Built-in structure and keyword guidance to help each article perform better in search.</p>
            </article>

            <article className="card">
              <h3>Easy export</h3>
              <p>One-click export to WordPress or Markdown with headings, images and metadata preserved.</p>
            </article>

            <article className="card">
              <h3>Workspace & team</h3>
              <p>Save drafts, manage team access, and publish when ready (coming soon for full workspaces).</p>
            </article>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-inner">
          <div>© {new Date().getFullYear()} SynapseWrite</div>
          <div className="lp-links">
            <a href="/pricing">Pricing</a>
            <a href="/docs">Docs</a>
            <a href="mailto:support@synapsewrite.io">Support</a>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Poppins:wght@600;700&display=swap');

        :root{
          --bg:#f7f8fa;
          --text:#0f1724;
          --muted:#6b7280;
          --accent-start:#0b69ff;
          --accent-end:#00c2ff;
          --card:#fff;
        }

        .landing-root{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:var(--text);background:var(--bg);min-height:100vh}

        /* Hero */
        .hero-outer{padding:48px 0}
        .hero-inner{max-width:1200px;margin:0 auto;display:flex;gap:36px;align-items:center;padding:0 24px}
        .hero-left{flex:1;max-width:660px}
        .eyebrow{font-weight:700;color:var(--accent-start);display:inline-block;margin-bottom:14px;font-family:Poppins,Inter}
        .heading{font-family:Poppins,Inter;font-size:40px;line-height:1.03;margin:0 0 14px;font-weight:600}
        .sub{color:var(--muted);font-size:16px;line-height:1.6;margin:0 0 20px;max-width:64ch}

        .hero-ctas{display:flex;gap:12px;align-items:center;margin-bottom:20px}
        .cta-primary{text-decoration:none;padding:12px 18px;border-radius:12px;background:linear-gradient(90deg,var(--accent-start),var(--accent-end));color:white;font-weight:700;box-shadow:0 18px 48px rgba(11,105,255,0.08)}
        .cta-secondary{text-decoration:none;padding:10px 16px;border-radius:10px;border:1px solid rgba(15,23,36,0.06);color:var(--text);font-weight:600}

        .trust{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
        .trust-pill{background:var(--card);padding:8px 12px;border-radius:10px;border:1px solid rgba(15,23,36,0.04);font-weight:600;color:var(--muted);font-size:14px}

        /* Right mock */
        .hero-right{width:420px}
        .mock{background:linear-gradient(180deg, #ffffff, #fbfdff);border-radius:14px;border:1px solid rgba(15,23,36,0.04);padding:14px;box-shadow:0 18px 48px rgba(2,6,23,0.04)}
        .mock-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .mock-title{font-weight:700}
        .mock-badge{background:linear-gradient(90deg,var(--accent-start),var(--accent-end));color:white;padding:6px 10px;border-radius:8px;font-weight:700;font-size:12px}

        .mock-body{background:rgba(15,23,36,0.02);padding:12px;border-radius:10px}
        .mock-inputrow{display:flex;gap:8px;margin-bottom:10px}
        .mock-input{height:42px;border-radius:8px;background:white;border:1px solid rgba(15,23,36,0.04)}
        .mock-input.small{width:100px}
        .mock-input.short{flex:1}
        .mock-buttons{display:flex;gap:8px;margin-bottom:12px}
        .mock-btn{height:36px;width:80px;border-radius:8px;background:white;border:1px solid rgba(15,23,36,0.04)}
        .mock-btn.primary{background:linear-gradient(90deg,var(--accent-start),var(--accent-end));border:none}
        .mock-article{padding:8px;border-radius:8px;background:white}
        .mock-line{height:8px;background:linear-gradient(90deg,#f1f5f9,#fff);border-radius:6px;margin-bottom:8px}
        .mock-line.short{width:40%}
        .mock-line.long{width:95%}

        /* Features grid */
        .features{padding:36px 0}
        .features-inner{max-width:1200px;margin:0 auto;padding:0 24px}
        .features-title{font-family:Poppins,Inter;font-size:20px;margin:0 0 18px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
        .card{background:var(--card);padding:18px;border-radius:12px;border:1px solid rgba(15,23,36,0.04);box-shadow:0 12px 30px rgba(2,6,23,0.03)}
        .card h3{margin:0 0 8px;font-family:Poppins,Inter}
        .card p{margin:0;color:var(--muted);line-height:1.6}

        .lp-footer{border-top:1px solid rgba(15,23,36,0.04);padding:20px 0;margin-top:36px;background:transparent}
        .lp-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;justify-content:space-between;align-items:center;color:var(--muted)}
        .lp-links a{margin-left:18px;color:var(--muted);text-decoration:none}

        @media (max-width:1100px){
          .grid{grid-template-columns:repeat(2,1fr)}
          .hero-inner{flex-direction:column;align-items:stretch}
          .hero-right{width:100%}
        }
        @media (max-width:640px){
          .grid{grid-template-columns:1fr}
          .heading{font-size:28px}
        }
      `}</style>
    </div>
  );
}
