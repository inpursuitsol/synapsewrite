export default function Shipping() {
  return (
    <main style={{padding:'2rem',maxWidth:900,margin:'0 auto',fontFamily:'system-ui,Arial'}}>
      <h1 style={{fontSize:28,marginBottom:12}}>Shipping Policy</h1>

      <p>
        SynapseWrite delivers digital services and content. There is no physical shipping
        for our plans. All subscriptions and generated content are delivered instantly
        via your account dashboard and email (where applicable).
      </p>

      <p style={{marginTop:12}}>
        If you believe you have not received access to a paid service, please contact
        <a href="mailto:support@synapsewrite.io"> support@synapsewrite.io</a> and we will assist promptly.
      </p>

      <p style={{marginTop:20,fontSize:14,color:'#444'}}>
        Last updated: {new Date().toISOString().slice(0,10)}
      </p>
    </main>
  );
}

