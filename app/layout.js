// app/layout.js
export const metadata = {
  title: "SynapseWrite",
  description: "SynapseWrite — AI writing co-pilot",
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
              <a className="nav-cta" href="/signup">Create account</a>
            </nav>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            <div>© {new Date().getFullYear()} SynapseWrite</div>
            <div className="footer-right">Support: <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a></div>
          </footer>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Poppins:wght@600;700&display=swap');

          :root{
            --bg:#f7f8fa;
            --text:#0f1724;
            --muted:#6b7280;
            --accent:#0b69ff;
            --accent-2:#00c2ff;
          }

          html,body{height:100%;margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial}
          .root-shell{min-height:100vh;display:flex;flex-direction:column}
          .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid rgba(15,23,36,0.04);background:rgba(255,255,255,0.92);backdrop-filter: blur(4px)}
          .left{display:flex;align-items:center;gap:12px}
          .logo{display:grid;place-items:center;width:52px;height:52px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:white;font-weight:700;text-decoration:none;font-family:Poppins,Inter}
          .brand-title{font-weight:700;font-size:18px}
          .brand-sub{font-size:12px;color:var(--muted)}

          .nav{display:flex;gap:12px;align-items:center}
          .nav-link{text-decoration:none;color:var(--muted);padding:8px 10px;border-radius:8px;font-weight:600}
          .nav-link:hover{background:rgba(11,105,255,0.06);color:var(--text)}
          .nav-cta{text-decoration:none;background:linear-gradient(90deg,var(--accent),var(--accent-2));color:white;padding:8px 12px;border-radius:10px;font-weight:800}

          .main{flex:1;max-width:1200px;margin:28px auto;padding:0 20px 60px}
          .footer{padding:16px 28px;border-top:1px solid rgba(15,23,36,0.04);display:flex;justify-content:space-between;color:var(--muted)}
          .footer-right a{color:var(--text);text-decoration:underline}

          @media (max-width:900px){
            .nav{display:none}
            .topbar{padding:12px 16px}
            .main{padding:0 16px}
          }
        `}</style>
      </body>
    </html>
  );
}
