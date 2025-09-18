// app/features/export/page.js
export default function ExportFeature() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", paddingTop: 18, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontFamily: "Poppins, Inter" }}>Export to WordPress</h1>
          <div style={{ color: "#6b7280", marginTop: 6 }}>One-click export that preserves headings, images and metadata.</div>
        </div>
        <div>
          <a href="/generate" style={{ padding: "10px 14px", borderRadius: 10, background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", textDecoration: "none", fontWeight: 700 }}>Try export</a>
        </div>
      </div>

      <div style={{ marginTop: 22, background: "white", padding: 18, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
        <h3 style={{ marginTop: 0 }}>What export does</h3>
        <ul style={{ color: "#374151" }}>
          <li>Transforms editor content to WordPress-ready HTML and metadata.</li>
          <li>Supports images, headings, links, and frontmatter (for Markdown export).</li>
          <li>Optionally publish via WordPress REST API (connect with OAuth tokens in future).</li>
        </ul>

        <h4 style={{ marginTop: 16 }}>Next steps</h4>
        <p style={{ color: "#374151" }}>We can add a one-click publish pipeline that posts directly to your site — tell me which WordPress setup you use and I’ll scaffold it.</p>
      </div>
    </div>
  );
}
