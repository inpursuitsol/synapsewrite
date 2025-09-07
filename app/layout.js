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
        {/* Google font: Poppins for a modern friendly look */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Plausible (optional) */}
        <script defer data-domain="synapsewrite.vercel.app" src="https://plausible.io/js/plausible.js"></script>

        {/* favicon */}
        <link rel="icon" href="/favicon.svg" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body>
        {/* Top header bar */}
        <header className="site-header">
          <div className="container header-inner">
            <div className="brand">
              {/* glyph */}
              <svg
                width="44"
                height="44"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="SynapseWrite glyph"
                className="brand-glyph"
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

              {/* wordmark */}
              <div className="brand-text">
                <span className="brand-synapse">Synapse</span>
                <span className="brand-write">Write</span>
                <div className="brand-tagline">Your AI writing co-pilot — polished articles in seconds</div>
              </div>
            </div>

            <div className="header-right">
              <a className="site-link" href="https://synapsewrite.ai" target="_blank" rel="noreferrer">
                synapsewrite.ai
              </a>
              <span className="badge">Beta</span>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
