import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";

export default function PricingPage() {
  return (
    <main className="px-6 py-16">
      {/* your pricing UI */}
      <RazorpayCheckoutButton
        planName="SynapseWrite Pro — Monthly"
        amountInPaise={9900}
        // customerEmail="you@example.com" // optional
        // customerName="Anand"            // optional
      />
    </main>
  );
}
