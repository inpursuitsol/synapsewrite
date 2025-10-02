import Link from "next/link";

export const metadata = {
  title: "Payment Successful — SynapseWrite Pro",
  robots: { index: false },
};

type SearchParams = Record<string, string | undefined>;

export default function ThanksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const status = searchParams?.status ?? "success"; // success | pending
  const amount = searchParams?.amount ?? "";
  const orderId = searchParams?.order_id ?? "";
  const email = searchParams?.email ?? "";

  const isSuccess = status === "success";

  return (
    <main className="min-h-[70vh] mx-auto max-w-2xl px-6 py-16 flex flex-col items-center text-center">
      <div className="text-5xl mb-4">{isSuccess ? "✅" : "⏳"}</div>
      <h1 className="text-2xl font-semibold mb-2">
        {isSuccess
          ? "Payment Successful — Thank you for subscribing!"
          : "Payment Processing"}
      </h1>
      <p className="text-neutral-600 mb-6">
        {isSuccess
          ? "Your SynapseWrite Pro subscription is now active. A receipt will arrive at your email soon."
          : "We’re finalizing your payment. You’ll receive an email once it’s complete."}
      </p>

      <div className="w-full grid gap-2 text-sm border rounded-xl p-4 bg-white">
        {amount && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Amount</span>
            <span className="font-medium">{amount}</span>
          </div>
        )}
        {orderId && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Order ID</span>
            <span className="font-mono">{orderId}</span>
          </div>
        )}
        {email && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Email</span>
            <span className="font-medium">{email}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/" className="px-4 py-2 rounded-xl border">
          Go to Home
        </Link>
        <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-black text-white">
          Open App
        </Link>
      </div>
    </main>
  );
}
