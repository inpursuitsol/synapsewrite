export default function CancellationRefunds() {
  return (
    <main style={{padding:'2rem',maxWidth:900,margin:'0 auto',fontFamily:'system-ui,Arial'}}>
      <h1 style={{fontSize:28,marginBottom:12}}>Cancellation & Refunds Policy</h1>

      <p>
        SynapseWrite provides digital subscription-based services. Because our product
        delivers digital content and usage-based credits, cancellations are not available
        once a subscription period has started.
      </p>

      <p>
        Refunds may be issued only in limited cases such as:
      </p>
      <ul>
        <li>Duplicate payment</li>
        <li>Technical errors that prevented delivery of service for a sustained period</li>
      </ul>

      <p>
        All refund requests must be submitted to <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a>.
        We will investigate and respond within 5 business days.
      </p>

      <p style={{marginTop:20,fontSize:14,color:'#444'}}>
        Last updated: {new Date().toISOString().slice(0,10)}
      </p>
    </main>
  );
}
