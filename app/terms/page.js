export default function Terms() {
  return (
    <main style={{padding:'2rem',maxWidth:900,margin:'0 auto',fontFamily:'system-ui,Arial'}}>
      <h1 style={{fontSize:28,marginBottom:12}}>Terms & Conditions</h1>

      <p>
        These Terms & Conditions govern your use of SynapseWrite's website and services.
        By using our services you agree to these Terms.
      </p>

      <h2 style={{fontSize:18,marginTop:16}}>1. Services</h2>
      <p>
        SynapseWrite provides AI-assisted writing and subscription access to usage credits.
        Specific plan features and limits are described on the pricing page.
      </p>

      <h2 style={{fontSize:18,marginTop:12}}>2. Account & Payment</h2>
      <p>
        You are responsible for keeping your account credentials secure. Payments are
        handled by our payment provider; subscription renewals occur automatically unless
        cancelled in your account.
      </p>

      <h2 style={{fontSize:18,marginTop:12}}>3. Liability</h2>
      <p>
        SynapseWrite is not liable for indirect or consequential losses. Our total
        liability is limited to the amount paid for the service in the previous 12 months.
      </p>

      <p style={{marginTop:20}}>
        For questions, contact <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a>.
      </p>

      <p style={{marginTop:20,fontSize:14,color:'#444'}}>
        Last updated: {new Date().toISOString().slice(0,10)}
      </p>
    </main>
  );
}

