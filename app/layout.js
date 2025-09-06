// app/layout.js
import "./globals.css";

export const metadata = {
  title: "SynapseWrite",
  description: "AI-powered writing co-pilot",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
