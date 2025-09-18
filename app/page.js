<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SynapseWrite — AI article generator</title>
  <meta name="description" content="SynapseWrite: AI-powered article generator with WordPress & Markdown export, SEO scoring, and fast streaming authoring." />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root{
      --bg:#0f1724; /* deep navy */
      --card:#0f1728;
      --muted:#93a0b8;
      --accent:#7c5cff; /* purple */
      --accent-2:#00d4ff; /* cyan */
      --glass: rgba(255,255,255,0.04);
      --white: #edf2f9;
      --radius:14px;
      font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;background:linear-gradient(180deg,#071021 0%, #081226 40%, #04101a 100%);color:var(--white);-webkit-font-smoothing:antialiased;line-height:1.45}
    .container{max-width:1120px;margin:0 auto;padding:36px}

    /* Header */
    header{display:flex;align-items:center;justify-content:space-between;padding:8px 0}
    .brand{display:flex;align-items:center;gap:12px;font-weight:700}
    .logo{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 6px 18px rgba(124,92,255,0.12);font-weight:800}
    nav{display:flex;gap:18px;align-items:center}
    nav a{color:var(--muted);text-decoration:none;font-weight:600}
    .cta{background:linear-gradient(90deg,var(--accent),var(--accent-2));padding:10px 16px;border-radius:10px;color:#021; font-weight:700;text-decoration:none}

    /* Hero */
    .hero{display:grid;grid-template-columns:1fr 420px;gap:36px;align-items:center;padding:56px 0}
    .eyebrow{display:inline-block;padding:6px 10px;border-radius:999px;background:linear-gradient(90deg,rgba(124,92,255,0.12),rgba(0,212,255,0.06));color:var(--accent);font-weight:700}
    h1{font-size:40px;margin:18px 0;color:var(--white);line-height:1.03}
    p.lead{color:var(--muted);max-width:60ch}
    .actions{margin-top:20px;display:flex;gap:12px}
    .btn{background:transparent;border:1px solid rgba(255,255,255,0.06);padding:12px 18px;border-radius:12px;color:var(--white);font-weight:700}
    .btn-primary{background:linear-gradient(90deg,var(--accent),var(--accent-2));color:#021;border:none}

    /* Card */
    .card{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));padding:18px;border-radius:16px;border:1px solid rgba(255,255,255,0.03);box-shadow:0 10px 30px rgba(2,6,23,0.6)}
    .price{font-size:20px;font-weight:800}
    .features{display:grid;gap:10px;margin-top:12px}

    /* Features grid */
    .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:44px 0}
    .feature{background:var(--glass);padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,0.02)}
    .feature h4{margin:0 0 8px 0}
    .feature p{margin:0;color:var(--muted);font-size:14px}

    /* Footer */
    footer{padding:36px 0;border-top:1px solid rgba(255,255,255,0.02);color:var(--muted);display:flex;justify-content:space-between;align-items:center}

    /* Responsive */
    @media (max-width:980px){
      .hero{grid-template-columns:1fr;}
      .features-grid{grid-template-columns:repeat(2,1fr)}
      nav{display:none}
    }
    @media (max-width:600px){
      h1{font-size:28px}
      .features-grid{grid-template-columns:1fr}
      .container{padding:20px}
    }

    /* small helpers */
    .muted{color:var(--muted)}
    .small{font-size:13px}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo">SW</div>
        <div>
          <div style="font-size:15px">SynapseWrite</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">AI article generator</div>
        </div>
      </div>
      <nav>
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#docs">Docs</a>
        <a class="cta" href="#get-started">Get started</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div>
          <div class="eyebrow">Faster content, better SEO</div>
          <h1>Turn ideas into long-form articles in minutes — with human quality.</h1>
          <p class="lead">SynapseWrite uses a streaming authoring flow and SEO-aware templates so you can produce publish-ready articles, outlines, or blog series. Export to WordPress or Markdown and ship faster.</p>

          <div class="actions">
            <a class="btn-primary btn" href="#get-started">Try it free</a>
            <a class="btn" href="#demo">Watch demo</a>
          </div>

          <div style="display:flex;gap:16px;margin-top:20px;align-items:center">
            <div class="card" style="display:flex;gap:12px;align-items:center">
              <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:grid;place-items:center;font-weight:800">AI</div>
              <div>
                <div style="font-weight:700">Streaming mode</div>
                <div class="small muted">Write collaboratively while the article generates</div>
              </div>
            </div>

            <div class="card" style="display:flex;gap:12px;align-items:center">
              <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#26d07f,#00d4ff);display:grid;place-items:center;font-weight:800">WP</div>
              <div>
                <div style="font-weight:700">Export to WordPress</div>
                <div class="small muted">One-click export and Markdown compatibility</div>
              </div>
            </div>
          </div>

        </div>

        <aside>
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div class="small muted">Starter</div>
              <div class="price">Free • Forever</div>
            </div>
            <div style="font-weight:700">support@synapsewrite.io</div>
            <div class="features">
              <div class="small muted">5 users • 5 GB/user • WordPress export • SEO score</div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px">
              <a class="btn-primary btn" href="#get-started">Create account</a>
              <a class="btn" href="#contact">Contact sales</a>
            </div>
          </div>
        </aside>
      </section>

      <section id="features">
        <h2 style="margin:0 0 8px 0">What it does</h2>
        <p class="muted small">From brief to publishable article — faster and more consistent.</p>

        <div class="features-grid">
          <div class="feature">
            <h4>Streaming authoring</h4>
            <p>Generate sections live while you edit — reduces waiting and improves iteration speed.</p>
          </div>
          <div class="feature">
            <h4>SEO-aware templates</h4>
            <p>Built-in keyword & structure guidance so each article is optimized for search.</p>
          </div>
          <div class="feature">
            <h4>Easy export</h4>
            <p>Export to WordPress or Markdown with images, headings, and metadata preserved.</p>
          </div>
          <div class="feature">
            <h4>Team & roles</h4>
            <p>Invite writers, assign roles, and manage drafts in shared workspaces.</p>
          </div>
          <div class="feature">
            <h4>Fast previews</h4>
            <p>Live preview and content score to help you iterate faster.</p>
          </div>
          <div class="feature">
            <h4>Integrations</h4>
            <p>WordPress, Google Docs export, and API access for automation workflows.</p>
          </div>
        </div>
      </section>

      <section id="cta" style="margin:36px 0;padding:28px;border-radius:12px;background:linear-gradient(90deg, rgba(124,92,255,0.08), rgba(0,212,255,0.03));">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap">
          <div>
            <div style="font-weight:800;font-size:18px">Ready to ship content faster?</div>
            <div class="muted small">Create your free workspace and start publishing today.</div>
          </div>
          <div style="display:flex;gap:12px">
            <a class="btn-primary btn" href="#get-started">Sign up free</a>
            <a class="btn" href="#demo">Live demo</a>
          </div>
        </div>
      </section>

    </main>

    <footer>
      <div>
        <div style="font-weight:700">SynapseWrite</div>
        <div class="muted small">Made for creators — support@synapsewrite.io</div>
      </div>

      <div class="muted small">© 2025 SynapseWrite — Built with care</div>
    </footer>
  </div>
</body>
</html>
