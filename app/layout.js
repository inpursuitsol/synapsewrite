// app/layout.js
export const metadata = {
  title: "SynapseWrite",
  description: "SynapseWrite — AI article generator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
        <div className="root-shell">
          <header className="topbar" role="banner">
            <div className="left">
              <a className="logo" href="/" aria-label="SynapseWrite home">SW</a>
              <div className="brand">
                <div className="brand-title">SynapseWrite</div>
                <div className="brand-sub">AI writing co-pilot</div>
              </div>
            </div>

            <nav className="nav" role="navigation" aria-label="Main">
              <a className="nav-link" href="/generate">Editor</a>
              <a className="nav-link" href="/features/streaming">Features</a>
              <a className="nav-link" href="/pricing">Pricing</a>
              <a className="nav-link" href="/docs">Docs</a>

              {/* Single global primary CTA (only here) */}
              <a className="nav-cta" href="/signup">Create account</a>
            </nav>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            <div>© {new Date().getFullYear()} SynapseWrite</div>
            <div className="footer-right">Made for creators — <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a></div>
          </footer>
        </div>

        <style>{`
          /* Global shell: minimal, premium typography */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Poppins:wght@600;700&display=swap');

          :root{
            --bg:#f6f7f9;
            --muted:#6b7280;
            --accent:#0b69ff;
            --accent-2:#00c2ff;
            --text:#0f1724;
          }

          html,body{height:100%;margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial}
          .root-shell{min-height:100vh;display:flex;flex-direction:column}
          .topbar{display:flex;align-items:center;justify-content:space-between;padding:18px 36px;border-bottom:1px solid rgba(15,23,36,0.04);background:rgba(255,255,255,0.9);backdrop-filter: blur(4px)}
          .left{display:flex;align-items:center;gap:14px}
          .logo{display:grid;place-items:center;width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:white;font-weight:800;text-decoration:none;font-family:Poppins,Inter}
          .brand-title{font-weight:700;font-size:20px;font-family:Poppins,Inter}
          .brand-sub{font-size:13px;color:var(--muted);margin-top:2px}

          .nav{display:flex;gap:14px;align-items:center}
          .nav-link{text-decoration:none;color:var(--muted);padding:8px 12px;border-radius:9px;font-weight:600}
          .nav-link:hover{background:rgba(11,105,255,0.06);color:var(--text)}
          .nav-cta{text-decoration:none;background:linear-gradient(90deg,var(--accent),var(--accent-2));color:white;padding:9px 14px;border-radius:12px;font-weight:800;box-shadow:0 10px 30px rgba(11,105,255,0.08)}

          .main{flex:1;max-width:1260px;margin:34px auto;padding:0 28px 64px}
          .footer{padding:18px 36px;border-top:1px solid rgba(15,23,36,0.04);display:flex;justify-content:space-between;color:var(--muted)}
          .footer-right a{color:var(--text);text-decoration:underline}

          @media (max-width:920px){
            .nav{display:none}
            .topbar{padding:12px 18px}
            .main{padding:0 18px}
            .brand-title{font-size:18px}
            .logo{width:46px;height:46px}
          }
        `}</style>
      </body>
    </html>
  );
}
