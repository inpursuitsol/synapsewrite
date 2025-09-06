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
        {/* Plausible analytics - tracks usage */}
        <script
          defer
          data-domain="synapsewrite.vercel.app"
          src="https://plausible.io/js/plausible.js"
        ></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
