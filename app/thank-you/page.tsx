import React from "react";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful</h1>
        <p className="text-gray-700 mb-6">
          Welcome to <span className="font-semibold">SynapseWrite Pro</span> 🎉 <br />
          You now have access to all advanced AI features, export options, and premium support.
        </p>

        <a
          href="/"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
        >
          Go to Dashboard
        </a>
      </div>

      <footer className="mt-8 text-gray-500 text-sm">
        © {new Date().getFullYear()} SynapseWrite. All rights reserved.
      </footer>
    </div>
  );
}
