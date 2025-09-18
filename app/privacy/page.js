export default function Privacy() {
  return (
    <main style={{padding:'2rem',maxWidth:900,margin:'0 auto',fontFamily:'system-ui,Arial'}}>
      <h1 style={{fontSize:28,marginBottom:12}}>Privacy Policy</h1>

      <p>
        SynapseWrite respects your privacy. We collect only the information needed to
        provide our service: account email, billing details (via payment provider),
        and usage metadata required for the product.
      </p>

      <h2 style={{fontSize:18,marginTop:12}}>How we use data</h2>
      <p>
        We use personal data to authenticate accounts, process payments (through our
        payment provider), provide and improve the service, and communicate with users.
      </p>

      <h2 style={{fontSize:18,marginTop:12}}>Third parties</h2>
      <p>
        We use third-party services (e.g. payment processor, hosting, analytics). We do
        not sell personal data to third parties.
      </p>

      <p style={{marginTop:12}}>
        For privacy requests, contact <a href="mailto:privacy@synapsewrite.io">privacy@synapsewrite.io</a>.
      </p>

      <p style={{marginTop:20,fontSize:14,color:'#444'}}>
        Last updated: {new Date().toISOString().slice(0,10)}
      </p>
    </main>
  );
}
