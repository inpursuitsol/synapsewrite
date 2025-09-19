// app/cancellation-refunds/page.js
export const metadata = {
  title: "Refund & Cancellation Policy - SynapseWrite",
  description: "Refund and cancellation policy for SynapseWrite",
};

export default function CancellationRefunds() {
  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 20, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial" }}>
      <h1 style={{ fontFamily: "Poppins, Inter", fontSize: 28 }}>Refund & Cancellation Policy</h1>

      <p style={{ color: "#374151" }}>
        This Refund & Cancellation Policy explains how refunds and cancellations are handled for paid subscriptions and purchases made through SynapseWrite.
      </p>

      <section>
        <h2>Cancellation</h2>
        <p style={{ color: "#374151" }}>
          You may cancel your subscription at any time from your account settings. Cancellation will stop future billing at the end of the current billing period. You will retain access to the paid features until the period expires.
        </p>
      </section>

      <section>
        <h2>Refunds — overview</h2>
        <p style={{ color: "#374151" }}>
          We offer refunds in limited circumstances. The refund eligibility depends on the product and purchase circumstances described below.
        </p>
      </section>

      <section>
        <h3>1. Trial & Promotional Offers</h3>
        <p style={{ color: "#374151" }}>
          If you signed up for a promotional or trial period, charges made after the trial period are generally non-refundable. Contact support if you believe a billing error occurred.
        </p>
      </section>

      <section>
        <h3>2. Monthly subscriptions</h3>
        <p style={{ color: "#374151" }}>
          Monthly subscription charges are non-refundable once the billing period has started. You can cancel to avoid renewal; no partial-period refunds will be issued for time already used.
        </p>
      </section>

      <section>
        <h3>3. Annual subscriptions</h3>
        <p style={{ color: "#374151" }}>
          For annual subscriptions, we offer refunds if requested within <strong>14 days</strong> of the initial purchase date. After 14 days, refunds for annual subscriptions are handled at our discretion.
        </p>
      </section>

      <section>
        <h3>4. Exceptional cases</h3>
        <p style={{ color: "#374151" }}>
          We may issue refunds for exceptional cases (billing errors, duplicate charges, or service interruptions). To request a refund, contact support at <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a> with details of your purchase (date, transaction ID).
        </p>
      </section>

      <section>
        <h3>Refund timeline</h3>
        <p style={{ color: "#374151" }}>
          Approved refunds issued to the original payment method typically appear within 5–14 business days, depending on the payment provider and your bank. For Razorpay/credit-card refunds, actual timing depends on the card issuer's processing times.
        </p>
      </section>

      <section>
        <h3>How to request a refund</h3>
        <ol style={{ color: "#374151" }}>
          <li>Email <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a> with your account email and transaction details.</li>
          <li>We will acknowledge your request within 2 business days and investigate.</li>
          <li>If approved, we will issue a refund to the original payment method. Expect 5–14 business days for the funds to appear.</li>
        </ol>
      </section>

      <section>
        <h3>Contact</h3>
        <p style={{ color: "#374151" }}>
          For refund and cancellation support contact <a href="mailto:support@synapsewrite.io">support@synapsewrite.io</a>.
        </p>
      </section>
    </main>
  );
}
