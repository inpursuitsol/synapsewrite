// app/pricing/page.js
import RazorpayCheckoutButton from "../../components/RazorpayCheckoutButton";

export default function PricingPage() {
  return (
    <main className="min-h-screen px-6 py-16 flex flex-col items-center text-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-6">SynapseWrite Pro Plans</h1>
      <p className="text-gray-600 max-w-xl mb-12">
        Upgrade to <strong>SynapseWrite Pro</strong> and unlock advanced AI features,
        export options, and premium support.
      </p>

      <div className="border rounded-2xl shadow-md p-8 bg-white w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-2">Pro — Monthly Plan</h2>
        <p className="text-gray-500 mb-6">₹99.00 / month</p>

        <RazorpayCheckoutButton
          planName="SynapseWrite Pro — Monthly"
          amountInPaise={9900} // ₹99.00 in paise
          // customerEmail="user@example.com" // optional
          // customerName="Anand Rao"        // optional
        />
      </div>

      <p className="text-sm text-gray-500 mt-8">
        Payments are powered by Razorpay — secure and encrypted checkout.
      </p>
    </main>
  );
}
