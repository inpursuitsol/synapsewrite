// app/pricing/page.js
import { PLANS } from "../../lib/pricing";
import RazorpayCheckoutButton from "../../components/RazorpayCheckoutButton";

export const metadata = {
  title: "Pricing — SynapseWrite",
  description: "Choose a plan that fits your writing workflow.",
};

function Card({ title, price, period, features, cta }) {
  return (
    <div className="rounded-2xl bg-white shadow-lg border border-gray-100 p-8 max-w-md w-full">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mt-4">
        <div className="text-4xl font-bold">{price}</div>
        {period ? <div className="text-gray-500 text-sm mt-1">{period}</div> : null}
      </div>
      <ul className="mt-6 space-y-2 text-sm text-gray-700">
        {features.map((f, i) => (
          <li key={i} className="flex gap-2">
            <span>•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold">SynapseWrite Pro Plans</h1>
        <p className="mt-3 text-gray-600">
          Upgrade to <strong>SynapseWrite Pro</strong> and unlock advanced AI features, export options, and premium support.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3 place-items-center">
        {/* Free */}
        <Card
          title={PLANS.free.name}
          price={PLANS.free.displayPrice}
          features={PLANS.free.features}
          cta={
            <a
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border px-5 py-3 font-medium shadow-sm hover:bg-gray-50"
            >
              Create free account
            </a>
          }
        />

        {/* Pro Monthly */}
        <Card
          title={PLANS.proMonthly.name}
          price={PLANS.proMonthly.displayPrice}
          period={PLANS.proMonthly.period}
          features={PLANS.proMonthly.features}
          cta={
            <RazorpayCheckoutButton
              plan={PLANS.proMonthly.id}
              label={`Subscribe — ${PLANS.proMonthly.displayPrice}${PLANS.proMonthly.period}`}
            />
          }
        />

        {/* Pro Yearly */}
        <Card
          title={PLANS.proYearly.name}
          price={PLANS.proYearly.displayPrice}
          period={PLANS.proYearly.period}
          features={PLANS.proYearly.features}
          cta={
            <RazorpayCheckoutButton
              plan={PLANS.proYearly.id}
              label={`Subscribe — ${PLANS.proYearly.displayPrice}${PLANS.proYearly.period}`}
            />
          }
        />
      </div>

      <p className="mt-10 text-center text-sm text-gray-500">
        Payments are powered by Razorpay — secure and encrypted checkout. In test mode, no real charges occur.
      </p>
    </div>
  );
}
