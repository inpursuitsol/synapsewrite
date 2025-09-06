// app/layout.js
import "./globals.css";

export const metadata = {
  title: "SynapseWrite",
  description: "AI-powered article generator — SynapseWrite",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Plausible analytics (optional) */}
        <script
          defer
          data-domain="synapsewrite.vercel.app"
          src="https://plausible.io/js/plausible.js"
        ></script>

        {/* favicon */}
        <link rel="icon" href="/favicon.svg" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: "1px solid rgba(15,23,42,0.04)",
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Glyph (8D, optimized for small sizes) */}
            <svg
              width="44"
              height="44"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="SynapseWrite glyph"
              style={{ flex: "none", display: "block" }}
            >
              <rect width="48" height="48" rx="10" fill="#2563EB" />
              <path
                d="M14 16 L24 32 L34 22"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>

            {/* Wordmark text */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>
                Synapse
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#06B6D4", lineHeight: 1 }}>
                Write
              </span>
            </div>
          </div>

          <div style={{ marginLeft: "auto", fontSize: 13, color: "#6B7280" }}>
            <a href="https://synapsewrite.ai" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              synapsewrite.ai
            </a>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
