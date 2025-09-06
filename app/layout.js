import "./globals.css";

export const metadata = {
  title: "SynapseWrite",
  description: "AI-powered article generator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Plausible analytics - tracks usage */}
        <script
          defer
          data-domain="synapsewrite.vercel.app"
          src="https://plausible.io/js/plausible.js"
        ></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
