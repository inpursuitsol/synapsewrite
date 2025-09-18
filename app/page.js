"use client";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071021] via-[#081226] to-[#04101a] text-white font-sans">
      <div className="max-w-6xl mx-auto px-6 py-9">
        {/* Header */}
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3 font-bold">
            <div className="w-11 h-11 rounded-lg grid place-items-center bg-gradient-to-br from-purple-500 to-cyan-400 shadow-lg font-extrabold">
              SW
            </div>
            <div>
              <div className="text-sm">SynapseWrite</div>
              <div className="text-xs text-gray-400 mt-0.5">AI article generator</div>
            </div>
          </div>
          <nav className="hidden md:flex gap-5 items-center">
            <a href="#features" className="text-gray-400 font-semibold">Features</a>
            <a href="#pricing" className="text-gray-400 font-semibold">Pricing</a>
            <a href="#docs" className="text-gray-400 font-semibold">Docs</a>
            <a href="#get-started" className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-purple-500 to-cyan-400 text-black">Get started</a>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid md:grid-cols-[1fr_420px] gap-9 items-center py-14">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-400/10 text-purple-400 font-bold text-sm">
              Faster content, better SEO
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mt-5">
              Turn ideas into long-form articles in minutes — with human quality.
            </h1>
            <p className="text-gray-400 max-w-2xl mt-4">
              SynapseWrite uses a streaming authoring flow and SEO-aware templates so you can produce publish-ready articles, outlines, or blog series. Export to WordPress or Markdown and ship faster.
            </p>

            <div className="flex gap-3 mt-6">
              <a href="#get-started" className="px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 text-black">Try it free</a>
              <a href="#demo" className="px-5 py-3 rounded-xl font-bold border border-white/10">Watch demo</a>
            </div>

            <div className="flex gap-4 mt-6 items-center flex-wrap">
              <div className="flex gap-3 items-center bg-white/5 p-4 rounded-xl border border-white/5 shadow-lg">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 grid place-items-center font-extrabold">AI</div>
                <div>
                  <div className="font-bold">Streaming mode</div>
                  <div className="text-xs text-gray-400">Write collaboratively while the article generates</div>
                </div>
              </div>
              <div className="flex gap-3 items-center bg-white/5 p-4 rounded-xl border border-white/5 shadow-lg">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 grid place-items-center font-extrabold">WP</div>
                <div>
                  <div className="font-bold">Export to WordPress</div>
                  <div className="text-xs text-gray-400">One-click export and Markdown compatibility</div>
                </div>
              </div>
            </div>
          </div>

          <aside>
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-400">Starter</div>
                <div className="text-lg font-extrabold">Free • Forever</div>
              </div>
              <div className="font-bold">support@synapsewrite.io</div>
              <div className="text-xs text-gray-400 mt-2">5 users • 5 GB/user • WordPress export • SEO score</div>
              <div className="flex gap-3 mt-4">
                <a href="#get-started" className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-purple-500 to-cyan-400 text-black">Create account</a>
                <a href="#contact" className="px-4 py-2 rounded-lg font-bold border border-white/10">Contact sales</a>
              </div>
            </div>
          </aside>
        </section>

        {/* Features */}
        <section id="features" className="my-11">
          <h2 className="text-2xl font-bold mb-1">What it does</h2>
          <p className="text-gray-400 text-sm mb-6">From brief to publishable article — faster and more consistent.</p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {title: "Streaming authoring", desc: "Generate sections live while you edit — reduces waiting and improves iteration speed."},
              {title: "SEO-aware templates", desc: "Built-in keyword & structure guidance so each article is optimized for search."},
              {title: "Easy export", desc: "Export to WordPress or Markdown with images, headings, and metadata preserved."},
              {title: "Team & roles", desc: "Invite writers, assign roles, and manage drafts in shared workspaces."},
              {title: "Fast previews", desc: "Live preview and content score to help you iterate faster."},
              {title: "Integrations", desc: "WordPress, Google Docs export, and API access for automation workflows."},
            ].map((f, i) => (
              <div key={i} className="bg-white/5 p-5 rounded-xl border border-white/5">
                <h4 className="font-bold mb-1">{f.title}</h4>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="my-9 p-7 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-400/10">
          <div className="flex flex-wrap justify-between items-center gap-5">
            <div>
              <div className="font-extrabold text-lg">Ready to ship content faster?</div>
              <div className="text-sm text-gray-400">Create your free workspace and start publishing today.</div>
            </div>
            <div className="flex gap-3">
              <a href="#get-started" className="px-5 py-3 rounded-lg font-bold bg-gradient-to-r from-purple-500 to-cyan-400 text-black">Sign up free</a>
              <a href="#demo" className="px-5 py-3 rounded-lg font-bold border border-white/10">Live demo</a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-9 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm gap-3">
          <div>
            <div className="font-bold text-white">SynapseWrite</div>
            <div className="text-xs">Made for creators — support@synapsewrite.io</div>
          </div>
          <div>© 2025 SynapseWrite — Built with care</div>
        </footer>
      </div>
    </div>
  );
}
