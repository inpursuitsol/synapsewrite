export default function ThankYouPage() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-semibold text-green-600">Payment Successful 🎉</h1>
      <p className="text-gray-700 max-w-xl">
        Thank you! Your payment was verified and your order is complete.
      </p>
      <a
        href="/"
        className="inline-flex items-center rounded-lg px-5 py-3 bg-green-600 text-white hover:bg-green-700 transition"
      >
        Go Back Home
      </a>
    </main>
  );
}
