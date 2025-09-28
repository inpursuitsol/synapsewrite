// app/pricing/page.js
import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";

export const metadata = { title: "Pricing — SynapseWrite" };

export default function PricingPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-semibold">Pricing</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="p-6 rounded-2xl border border-black/10 bg-white">
          <h2 className="text-xl font-medium">Starter</h2>
          <p className="mt-2 text-sm text-black/70">For individuals and light use.</p>
          <p className="mt-4 text-2xl font-semibold">₹199</p>
          <div className="mt-6">
            <RazorpayCheckoutButton amountINR={199} planName="Starter Monthly" />
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-black/10 bg-white">
          <h2 className="text-xl font-medium">Pro</h2>
          <p className="mt-2 text-sm text-black/70">For professionals and agencies.</p>
          <p className="mt-4 text-2xl font-semibold">₹499</p>
          <div className="mt-6">
            <RazorpayCheckoutButton amountINR={499} planName="Pro Monthly" />
          </div>
        </div>
      </section>
    </main>
  );
}
