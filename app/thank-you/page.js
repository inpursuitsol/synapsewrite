// app/thank-you/page.js
"use client";

import Link from "next/link";

export const metadata = {
  title: "Thank you — SynapseWrite",
  description: "Your payment was successful. Welcome to SynapseWrite Pro!",
};

export default function ThankYouPage() {
  return (
    <main className="min-h-[80vh] flex items-center">
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src="/logo.png"
            alt="SynapseWrite"
            className="h-12 w-auto opacity-90"
            loading="lazy"
          />
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Payment successful 🎉
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          You’re now on <strong>SynapseWrite Pro</strong>. Enjoy unlimited
          generations, faster queues, and exports.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/generate"
            className="inline-flex items-center justify-center rounded-xl bg-black text-white px-6 py-3 font-medium hover:opacity-90"
          >
            Go to app
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border px-6 py-3 font-medium hover:bg-gray-50"
          >
            Back to Home
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-500">
          Need help?{" "}
          <a className="underline" href="mailto:support@synapsewrite.io">
            support@synapsewrite.io
          </a>
        </p>
      </div>
    </main>
  );
}
