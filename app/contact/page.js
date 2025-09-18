export default function Contact() {
  return (
    <main style={{padding:'2rem',maxWidth:900,margin:'0 auto',fontFamily:'system-ui,Arial'}}>
      <h1 style={{fontSize:28,marginBottom:12}}>Contact Us</h1>

      <p>
        Need help? Reach out and we’ll respond within 1–2 business days.
      </p>

      <ul>
        <li>Email: <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a></li>
        <li>Address: (If you want to include an address, paste it here)</li>
      </ul>

      <p style={{marginTop:12}}>
        For legal or billing queries, use <a href="mailto:billing@synapsewrite.io">billing@synapsewrite.io</a>.
      </p>

      <p style={{marginTop:20,fontSize:14,color:'#444'}}>
        Last updated: {new Date().toISOString().slice(0,10)}
      </p>
    </main>
  );
}

