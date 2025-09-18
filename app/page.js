"use client"
import React from "react";

export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#071021] via-[#081226] to-[#04101a] text-white font-sans">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-black font-extrabold">SW</div>
            <div>
              <div className="font-semibold">SynapseWrite</div>
              <div className="text-sm text-slate-400">AI article generator</div>
            </div>
          </div>

          <nav className="hidden md:flex gap-6 items-center text-slate-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#docs" className="hover:text-white">Docs</a>
            <a href="#get-started" className="bg-gradient-to-r from-purple-500 to-cyan-400 text-black px-4 py-2 rounded-lg font-semibold">Get started</a>
          </nav>
        </header>

        <section className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-700/10 to-cyan-400/6 text-sm font-semibold text-purple-300">Faster content, better SEO</span>
            <h1 className="mt-6 text-4xl lg:text-5xl font-extrabold leading-tight">Turn ideas into long-form articles in minutes — with human quality.</h1>
            <p className="mt-4 text-slate-300 max-w-2xl">SynapseWrite uses a streaming authoring flow and SEO-aware templates so you can produce publish-ready articles, outlines, or blog series. Export to WordPress or Markdown and ship faster.</p>

            <div className="mt-6 flex gap-3">
              <a href="#get-started" className="px-5 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-cyan-400 text-black">Try it free</a>
              <a href="#demo" className="px-5 py-3 rounded-lg border border-white/10 text-white">Watch demo</a>
            </div>

            <div className="mt-6 flex gap-4">
              <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-bold text-black">AI</div>
                <div>
                  <div className="font-semibold">Streaming mode</div>
                  <div className="text-sm text-slate-400">Write collaboratively while the article generates</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center font-bold text-black">WP</div>
                <div>
                  <div className="font-semibold">Export to WordPress</div>
                  <div className="text-sm text-slate-400">One-click export and Markdown compatibility</div>
                </div>
              </div>
            </div>
          </div>

          <aside>
            <div className="p-6 rounded-2xl bg-gradient-to-b from-white/3 to-white/2 border border-white/6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-300">Starter</div>
                <div className="text-xl font-extrabold">Free • Forever</div>
              </div>

              <div className="font-semibold text-lg">support@synapsewrite.io</div>
              <div className="text-sm text-slate-400 mt-2">5 users • 5 GB/user • WordPress export • SEO score</div>

              <div className="mt-4 flex gap-3">
                <a href="#get-started" className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-cyan-400 text-black">Create account</a>
                <a href="#contact" className="px-4 py-2 rounded-lg border border-white/10">Contact sales</a>
              </div>
            </div>
          </aside>
        </section>

        <section id="features" className="mt-16">
          <h2 className="text-2xl font-extrabold">What it does</h2>
          <p className="text-sm text-slate-400 mt-1">From brief to publishable article — faster and more consistent.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <Feature title="Streaming authoring" desc="Generate sections live while you edit — reduces waiting and improves iteration speed." />
            <Feature title="SEO-aware templates" desc="Built-in keyword & structure guidance so each article is optimized for search." />
            <Feature title="Easy export" desc="Export to WordPress or Markdown with images, headings, and metadata preserved." />
            <Feature title="Team & roles" desc="Invite writers, assign roles, and manage drafts in shared workspaces." />
            <Feature title="Fast previews" desc="Live preview and content score to help you iterate faster." />
            <Feature title="Integrations" desc="WordPress, Google Docs export, and API access for automation workflows." />
          </div>
        </section>

        <section className="mt-12 p-6 rounded-xl bg-gradient-to-r from-purple-700/6 to-cyan-400/6 flex items-center justify-between">
          <div>
            <div className="font-extrabold text-lg">Ready to ship content faster?</div>
            <div className="text-sm text-slate-400">Create your free workspace and start publishing today.</div>
          </div>
          <div className="flex gap-3">
            <a href="#get-started" className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-cyan-400 text-black">Sign up free</a>
            <a href="#demo" className="px-4 py-2 rounded-lg border border-white/10">Live demo</a>
          </div>
        </section>

        <footer className="mt-12 flex items-center justify-between text-slate-400 text-sm">
          <div>
            <div className="font-semibold">SynapseWrite</div>
            <div>Made for creators — support@synapsewrite.io</div>
          </div>

          <div>© 2025 SynapseWrite — Built with care</div>
        </footer>
      </div>
    </main>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="p-5 rounded-xl bg-white/3 border border-white/6">
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-slate-300">{desc}</p>
    </div>
  );
}
