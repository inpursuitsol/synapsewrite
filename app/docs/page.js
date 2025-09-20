// app/docs/page.js
export const metadata = {
  title: "Docs - SynapseWrite",
  description: "Documentation and help for SynapseWrite",
};

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontFamily: "Poppins, Inter", fontSize: 28, margin: 0 }}>Documentation</h1>
      <p style={{ color: "#6b7280", marginTop: 8 }}>Guides, FAQs, and developer notes to help you use SynapseWrite.</p>

      <nav style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="#getting-started" style={{ textDecoration: "none", color: "#0b69ff" }}>Getting started</a>
        <a href="#editor" style={{ textDecoration: "none", color: "#0b69ff" }}>Editor</a>
        <a href="#export" style={{ textDecoration: "none", color: "#0b69ff" }}>Export & WordPress</a>
        <a href="#billing" style={{ textDecoration: "none", color: "#0b69ff" }}>Billing & Pricing</a>
        <a href="#support" style={{ textDecoration: "none", color: "#0b69ff" }}>Support</a>
      </nav>

      <section id="getting-started" style={{ marginTop: 22 }}>
        <h2>Getting started</h2>
        <ol style={{ color: "#374151" }}>
          <li>Create an account at <a href="/signup">Create account</a>.</li>
          <li>Open <a href="/generate">Editor</a> and enter a title/idea to generate content (or try the demo at <a href="/demo">Demo</a>).</li>
          <li>Edit, copy, or download the article; use Export to publish to WordPress or download Markdown.</li>
        </ol>
      </section>

      <section id="editor" style={{ marginTop: 18 }}>
        <h2>Editor</h2>
        <p style={{ color: "#374151" }}>The editor supports streaming generation, copy, download, and SEO checks. You can edit the generated content before exporting.</p>
      </section>

      <section id="export" style={{ marginTop: 18 }}>
        <h2>Export & WordPress</h2>
        <p style={{ color: "#374151" }}>Use the Export features to prepare content for WordPress or Markdown. For WordPress publish automation we support REST integrations — contact us to enable.</p>
      </section>

      <section id="billing" style={{ marginTop: 18 }}>
        <h2>Billing & Pricing</h2>
        <p style={{ color: "#374151" }}>See the public pricing page at <a href="/pricing">/pricing</a>. Contact sales for invoicing or yearly plan options.</p>
      </section>

      <section id="support" style={{ marginTop: 18 }}>
        <h2>Support</h2>
        <p style={{ color: "#374151" }}>If you need help, email <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a> with your account email and a short description. We typically respond within 1–2 business days.</p>
      </section>
    </main>
  );
}
