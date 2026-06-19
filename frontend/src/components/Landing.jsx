export default function Landing({ onGetStarted, onLogin }) {
  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">P</span>
          </div>
          <span className="font-black text-slate-900 text-xl tracking-tight">PropIQ</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition">Features</a>
          <a href="#about" className="text-sm text-slate-600 hover:text-slate-900 transition">About</a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 transition"
          >
            Login
          </button>
          <button
            onClick={onGetStarted}
            className="text-sm font-semibold bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-700 transition"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-green-400 rounded-full filter blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-slate-200 font-medium">Now showing what Zillow removed in 2025</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
            Real Estate Intelligence.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
              Unbiased.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            The only platform that shows you what Zillow won&apos;t — air quality, pollen, flood risk,
            and AI-powered investment scoring across 8 specialist agents.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-4 rounded-full text-base transition shadow-lg shadow-green-500/25"
            >
              Get Started Free
            </button>
            <button
              onClick={onLogin}
              className="w-full sm:w-auto border border-white/30 hover:border-white/60 text-white font-semibold px-8 py-4 rounded-full text-base transition"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Score preview strip */}
        <div className="relative max-w-4xl mx-auto px-8 pb-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Price Momentum", score: 72, color: "text-green-400" },
              { label: "Air Quality (AQI)", score: 55, color: "text-amber-400" },
              { label: "Rental Yield", score: 68, color: "text-green-400" },
              { label: "Pollen Index", score: 61, color: "text-amber-400" },
            ].map(({ label, score, color }) => (
              <div key={label} className="text-center">
                <div className={`text-3xl font-black ${color}`}>{score}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${score >= 70 ? "bg-green-400" : "bg-amber-400"}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="max-w-5xl mx-auto px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-3">Why PropIQ</p>
          <h2 className="text-4xl font-black text-slate-900">Everything Zillow won&apos;t tell you</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🌬️",
              title: "Unbiased Environmental Data",
              body: "Full EPA AQI scores, PM2.5 breakdowns, seasonal pollen calendars, FEMA flood zones, and wildfire risk. Zillow removed this data in November 2025 under industry pressure. We didn't.",
              tag: "Zillow removed this",
              tagColor: "bg-red-50 text-red-600",
            },
            {
              icon: "🤖",
              title: "AI Investment Scoring",
              body: "8 specialist LangGraph agents analyze every dimension: price trends, neighborhood quality, rental yield, 12-month forecast, AQI, pollen, climate, and Airbnb STR viability.",
              tag: "8 specialist agents",
              tagColor: "bg-blue-50 text-blue-600",
            },
            {
              icon: "📄",
              title: "Downloadable PDF Reports",
              body: "Export a full 4-page professional investment report for any property in seconds — cover page, scorecard, full analysis, environmental data, and legal disclaimer included.",
              tag: "4-page report",
              tagColor: "bg-green-50 text-green-600",
            },
          ].map(({ icon, title, body, tag, tagColor }) => (
            <div key={title} className="bg-white border border-slate-200 rounded-2xl p-7 hover:shadow-lg hover:border-slate-300 transition group">
              <div className="text-3xl mb-4">{icon}</div>
              <div className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${tagColor}`}>{tag}</div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About strip */}
      <section id="about" className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-400 uppercase tracking-widest mb-3">Our Mission</p>
            <h2 className="text-3xl font-black mb-4">Transparent data for smarter decisions</h2>
            <p className="text-slate-300 leading-relaxed">
              PropIQ was built because the real estate industry has a transparency problem.
              When platforms remove pollution data, flood risk scores, and climate data to appease
              industry partners, buyers and investors suffer. We show everything, explained clearly,
              so you can make truly informed decisions.
            </p>
          </div>
          <div className="flex-shrink-0 grid grid-cols-2 gap-4">
            {[["8", "AI Agents"], ["100+", "Data Points"], ["4-Page", "PDF Report"], ["Free", "To Start"]].map(([num, label]) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-2xl font-black text-green-400">{num}</div>
                <div className="text-xs text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-8 py-20 text-center">
        <h2 className="text-4xl font-black text-slate-900 mb-4">Ready to invest smarter?</h2>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          Analyze any US ZIP code in seconds. No credit card required.
        </p>
        <button
          onClick={onGetStarted}
          className="bg-slate-900 hover:bg-slate-700 text-white font-bold px-10 py-4 rounded-full text-base transition"
        >
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white font-black text-xs">P</span>
            </div>
            <span className="font-black text-slate-900">PropIQ</span>
          </div>
          <p className="text-xs text-slate-400">
            For research and informational purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
