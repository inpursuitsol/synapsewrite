// app/shipping/page.js
export default function Shipping() {
  return (
    <main style={{padding:'2rem',maxWidth:900,margin:'0 auto',fontFamily:'system-ui,Arial'}}>
      <h1 style={{fontSize:28,marginBottom:12}}>Shipping Policy</h1>

      <p>
        SynapseWrite is a digital SaaS product. There is no physical shipping for our plans.
        All subscription features and generated content are delivered instantly via the user's
        account dashboard and email (where applicable).
      </p>

      <h2 style={{marginTop:16}}>Delivery & Access</h2>
      <p>
        After successful payment, access to SynapseWrite features is provisioned immediately.
        No physical products are shipped.
      </p>

      <h2 style={{marginTop:16}}>Issues with access</h2>
      <p>
        If you do not receive access within 15 minutes of payment, contact support at
        <a href="mailto:support@synapsewrite.io"> support@synapsewrite.io</a>.
      </p>

      <p style={{marginTop:20,fontSize:14,color:'#444'}}>Last updated: {new Date().toISOString().slice(0,10)}</p>
    </main>
  );
}
