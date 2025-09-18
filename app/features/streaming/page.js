// app/features/streaming/page.js
export default function StreamingFeature() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", paddingTop: 18, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontFamily: "Poppins, Inter" }}>Streaming authoring</h1>
          <div style={{ color: "#6b7280", marginTop: 6 }}>Write sections as they are generated — low latency, high control.</div>
        </div>
        <div>
          <a href="/generate" style={{ padding: "10px 14px", borderRadius: 10, background: "linear-gradient(90deg,#0b69ff,#00c2ff)", color: "white", textDecoration: "none", fontWeight: 700 }}>Try streaming</a>
        </div>
      </div>

      <div style={{ marginTop: 22, background: "white", padding: 18, borderRadius: 12, border: "1px solid rgba(15,23,36,0.04)" }}>
        <h3 style={{ marginTop: 0 }}>How it helps</h3>
        <ul style={{ color: "#374151" }}>
          <li>Instant section generation so you can edit while the model continues producing.</li>
          <li>Faster iteration — no more waiting for a full article to generate.</li>
          <li>Tighter control — accept, edit, or regenerate sections independently.</li>
        </ul>

        <h4 style={{ marginTop: 16 }}>Examples</h4>
        <p style={{ color: "#374151" }}>Use streaming for long-form articles where you want to keep editing while the model continues to produce subsequent sections.</p>
      </div>
    </div>
  );
}
