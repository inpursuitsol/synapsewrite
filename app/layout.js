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
        <div className="sw-shell">
          <header className="sw-header">
            <div className="sw-left">
              <a href="/" className="sw-logo">SW</a>
              <div className="sw-brand">
                <div className="sw-title">SynapseWrite</div>
                <div className="sw-tag">AI writing co-pilot</div>
              </div>
            </div>

            <nav className="sw-nav" aria-label="Main navigation">
              <a href="/" className="sw-nav-link">Home</a>
              <a href="/generate" className="sw-nav-link">Write</a>
              <a href="/docs" className="sw-nav-link">Docs</a>
              <a href="mailto:support@synapsewrite.io" className="sw-cta">Contact</a>
            </nav>
          </header>

          <main className="sw-main">{children}</main>

          <footer className="sw-footer">
            <div>© {new Date().getFullYear()} SynapseWrite</div>
            <div className="sw-footer-right">Made for creators — support@synapsewrite.io</div>
          </footer>
        </div>

        <style>{`
          /* Global shell styles */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Poppins:wght@600;700&display=swap');

          :root{
            --bg: #06111a;
            --card: #071826;
            --muted: #98a7b6;
            --accent-1: #7c5cff;
            --accent-2: #00d4ff;
            --white: #eef6fb;
          }

          html,body,#root {height:100%}
          body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:linear-gradient(180deg,var(--bg),#031018);color:var(--white);-webkit-font-smoothing:antialiased}

          .sw-shell{min-height:100vh;display:flex;flex-direction:column}
          .sw-header{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-bottom:1px solid rgba(255,255,255,0.02);backdrop-filter: blur(4px);background:linear-gradient(180deg, rgba(2,6,23,0.6), rgba(2,6,23,0.45));}
          .sw-left{display:flex;align-items:center;gap:12px}
          .sw-logo{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,var(--accent-1),var(--accent-2));color:#021;font-weight:800;text-decoration:none}
          .sw-brand{line-height:1}
          .sw-title{font-weight:700;letter-spacing:-0.2px}
          .sw-tag{font-size:13px;color:var(--muted);margin-top:2px}

          .sw-nav{display:flex;gap:12px;align-items:center}
          .sw-nav-link{color:var(--muted);text-decoration:none;padding:8px 10px;border-radius:8px}
          .sw-nav-link:hover{color:var(--white);background:rgba(255,255,255,0.02)}
          .sw-cta{background:linear-gradient(90deg,var(--accent-1),var(--accent-2));color:#021;padding:8px 12px;border-radius:8px;text-decoration:none;font-weight:700}

          .sw-main{flex:1;padding:28px;max-width:1200px;margin:0 auto;width:100%}
          .sw-footer{display:flex;justify-content:space-between;align-items:center;padding:18px 28px;border-top:1px solid rgba(255,255,255,0.02);color:var(--muted);font-size:13px}
          .sw-footer-right{opacity:0.9}

          @media (max-width:900px){
            .sw-nav{display:none}
            .sw-main{padding:18px}
          }
        `}</style>
      </body>
    </html>
  );
}
