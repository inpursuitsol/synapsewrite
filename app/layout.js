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
          <header className="topbar">
            <div className="left">
              <a className="logo" href="/" aria-label="SynapseWrite home">SW</a>
              <div className="brand">
                <div className="brand-title">SynapseWrite</div>
                <div className="brand-sub">AI writing co-pilot</div>
              </div>
            </div>

            <nav className="nav">
              <a className="nav-link" href="/generate">Write</a>
              <a className="nav-link" href="/pricing">Pricing</a>
              <a className="nav-link" href="/docs">Docs</a>
              <a className="nav-cta" href="mailto:support@synapsewrite.io">Contact</a>
            </nav>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            <div>© {new Date().getFullYear()} SynapseWrite</div>
            <div className="footer-right">Made for creators — <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a></div>
          </footer>
        </div>

        <style>{`
          /* Global shell: Apple-like, minimal, roomy */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

          :root{
            --bg: #f6f7f9; /* light background for Apple-like look */
            --card: #ffffff;
            --muted: #6b7280;
            --accent: #0b69ff; /* crisp blue */
            --accent-2: #10b981; /* subtle green */
            --text: #0f1724;
            --glass: rgba(15,23,36,0.04);
          }

          html,body{height:100%;margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;}
          .root-shell{min-height:100vh;display:flex;flex-direction:column}
          .topbar{display:flex;align-items:center;justify-content:space-between;padding:18px 36px;border-bottom:1px solid rgba(15,23,36,0.06);background:linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.6));backdrop-filter: blur(6px)}
          .left{display:flex;align-items:center;gap:14px}
          .logo{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#0b69ff,#00c2ff);color:white;font-weight:700;text-decoration:none}
          .brand-title{font-weight:700;font-size:16px}
          .brand-sub{font-size:12px;color:var(--muted);margin-top:2px}

          .nav{display:flex;gap:14px;align-items:center}
          .nav-link{text-decoration:none;color:var(--muted);padding:8px 12px;border-radius:9px;font-weight:600}
          .nav-link:hover{background:rgba(11,105,255,0.06);color:var(--text)}
          .nav-cta{text-decoration:none;background:linear-gradient(90deg,#0b69ff,#00c2ff);color:white;padding:8px 12px;border-radius:10px;font-weight:700}

          .main{flex:1;max-width:1200px;margin:28px auto;padding:0 28px 48px}
          .footer{padding:18px 36px;border-top:1px solid rgba(15,23,36,0.04);display:flex;justify-content:space-between;color:var(--muted)}
          .footer-right a{color:var(--text);text-decoration:underline}

          @media (max-width:900px){
            .nav{display:none}
            .topbar{padding:12px 18px}
            .main{padding:0 18px}
          }
        `}</style>
      </body>
    </html>
  );
}
