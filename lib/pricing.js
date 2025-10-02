// lib/pricing.js
// Centralized pricing (amounts are in paise)

export const PLANS = {
  free: {
    id: "free",
    name: "Free Plan",
    displayPrice: "₹0",
    amountPaise: 0,
    features: [
      "Basic AI editor",
      "Limited generations",
      "Community support",
    ],
  },

  proMonthly: {
    id: "pro-monthly",
    name: "Pro Monthly",
    displayPrice: "₹499",
    amountPaise: 49900,   // ₹499
    period: "/ month",
    features: [
      "Unlimited generations",
      "Priority queue",
      "Export: Markdown & WordPress",
      "Basic SEO scoring",
      "Email support",
    ],
  },

  proYearly: {
    id: "pro-yearly",
    name: "Pro Yearly",
    displayPrice: "₹3,999",
    amountPaise: 399900,  // ₹3,999
    period: "/ year",
    features: [
      "Everything in Monthly",
      "2 months free vs monthly",
      "Priority support",
    ],
  },
};

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}
