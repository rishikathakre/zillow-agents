export default function Landing({ onGetStarted, onLogin }) {
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 sticky top-0 z-50"
        style={{ borderBottom: "1px solid #E2E8F0", background: "rgba(248,250,252,0.95)", backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center" style={{
            width: 32, height: 32, background: "#0EA5E9", borderRadius: 8,
          }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>P</span>
          </div>
          <span style={{ fontWeight: 800, color: "#0F172A", fontSize: 20, letterSpacing: "-0.02em" }}>PropIQ</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}>Features</a>
          <a href="#about" style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}>About</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onLogin} style={{ fontSize: 13, fontWeight: 600, color: "#475569", background: "none", border: "none", padding: "8px 16px", cursor: "pointer" }}>
            Login
          </button>
          <button onClick={onGetStarted}
            style={{ fontSize: 13, fontWeight: 600, background: "#0EA5E9", color: "white", padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", transition: "background 150ms" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#0284C7"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "#F0F9FF" }}>
        <div className="absolute inset-0 opacity-[0.15]">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full filter blur-3xl" style={{ background: "#0EA5E9" }} />
          <div className="absolute bottom-10 right-20 w-80 h-80 rounded-full filter blur-3xl" style={{ background: "#10B981" }} />
        </div>
        <div className="relative max-w-5xl mx-auto px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8"
            style={{ background: "white", border: "1px solid #BAE6FD" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#10B981" }} />
            <span style={{ fontSize: 13, color: "#0369A1", fontWeight: 500 }}>Now showing what Zillow removed in 2025</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, color: "#0C4A6E", lineHeight: 1, marginBottom: 24, letterSpacing: "-0.03em" }}>
            Real Estate Intelligence.
            <br />
            <span style={{ color: "#0EA5E9" }}>Unbiased.</span>
          </h1>
          <p style={{ fontSize: 18, color: "#0369A1", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.6 }}>
            The only platform that shows you what Zillow won&apos;t -- air quality, pollen, flood risk,
            and AI-powered investment scoring across 8 specialist agents.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onGetStarted}
              className="w-full sm:w-auto"
              style={{
                background: "#0EA5E9", color: "white", fontWeight: 700, padding: "16px 32px",
                borderRadius: 12, fontSize: 16, border: "none", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(14,165,233,0.3)", transition: "background 150ms",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#0284C7"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
            >
              Get Started Free
            </button>
            <button onClick={onLogin}
              className="w-full sm:w-auto"
              style={{
                border: "1px solid #BAE6FD", color: "#0C4A6E", fontWeight: 600,
                padding: "16px 32px", borderRadius: 12, fontSize: 16,
                background: "white", cursor: "pointer", transition: "border-color 150ms",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#0EA5E9"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#BAE6FD"}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Score preview strip */}
        <div className="relative max-w-4xl mx-auto px-8 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{
            background: "white", border: "1px solid #BAE6FD",
            borderRadius: 12, padding: 24,
          }}>
            {[
              { label: "Price Momentum", score: 72, color: "#10B981" },
              { label: "Air Quality (AQI)", score: 55, color: "#F59E0B" },
              { label: "Rental Yield", score: 68, color: "#10B981" },
              { label: "Pollen Index", score: 61, color: "#F59E0B" },
            ].map(({ label, score, color }) => (
              <div key={label} className="text-center">
                <div style={{ fontSize: 28, fontWeight: 800, color }}>{score}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, fontWeight: 500 }}>{label}</div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="max-w-5xl mx-auto px-8 py-20">
        <div className="text-center mb-14">
          <p style={{ fontSize: 12, fontWeight: 600, color: "#0EA5E9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Why PropIQ</p>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Everything Zillow won&apos;t tell you</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Unbiased Environmental Data",
              body: "Full EPA AQI scores, PM2.5 breakdowns, seasonal pollen calendars, FEMA flood zones, and wildfire risk. Zillow removed this data in November 2025 under industry pressure. We didn't.",
              tag: "Zillow removed this",
              tagBg: "#FEF2F2", tagColor: "#991B1B", tagBorder: "#FCA5A5",
            },
            {
              title: "AI Investment Scoring",
              body: "8 specialist LangGraph agents analyze every dimension: price trends, neighborhood quality, rental yield, 12-month forecast, AQI, pollen, climate, and Airbnb STR viability.",
              tag: "8 specialist agents",
              tagBg: "#E0F2FE", tagColor: "#0369A1", tagBorder: "#BAE6FD",
            },
            {
              title: "Downloadable PDF Reports",
              body: "Export a full 4-page professional investment report for any property in seconds -- cover page, scorecard, full analysis, environmental data, and legal disclaimer included.",
              tag: "4-page report",
              tagBg: "#ECFDF5", tagColor: "#065F46", tagBorder: "#A7F3D0",
            },
          ].map(({ title, body, tag, tagBg, tagColor, tagBorder }) => (
            <div key={title} style={{
              background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28,
              transition: "border-color 200ms, box-shadow 200ms", cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#BAE6FD";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(14,165,233,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E2E8F0";
              e.currentTarget.style.boxShadow = "none";
            }}>
              <div className="w-2 h-2 rounded-full mb-4" style={{ background: tagColor }} />
              <div className="inline-block mb-3" style={{
                fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 8,
                background: tagBg, color: tagColor, border: `1px solid ${tagBorder}`,
              }}>{tag}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>{title}</h3>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About strip */}
      <section id="about" style={{ background: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div className="max-w-5xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <p style={{ fontSize: 12, fontWeight: 600, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Our Mission</p>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", marginBottom: 16, letterSpacing: "-0.02em" }}>Transparent data for smarter decisions</h2>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>
              PropIQ was built because the real estate industry has a transparency problem.
              When platforms remove pollution data, flood risk scores, and climate data to appease
              industry partners, buyers and investors suffer. We show everything, explained clearly,
              so you can make truly informed decisions.
            </p>
          </div>
          <div className="flex-shrink-0 grid grid-cols-2 gap-4">
            {[["8", "AI Agents"], ["100+", "Data Points"], ["4-Page", "PDF Report"], ["Free", "To Start"]].map(([num, label]) => (
              <div key={label} className="text-center" style={{
                background: "#F0F9FF", border: "1px solid #BAE6FD",
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0EA5E9" }}>{num}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-8 py-20 text-center">
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", marginBottom: 16, letterSpacing: "-0.02em" }}>Ready to invest smarter?</h2>
        <p style={{ color: "#475569", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
          Analyze any US ZIP code in seconds. No credit card required.
        </p>
        <button onClick={onGetStarted}
          style={{
            background: "#0EA5E9", color: "white", fontWeight: 700, padding: "16px 40px",
            borderRadius: 12, fontSize: 16, border: "none", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(14,165,233,0.3)", transition: "background 150ms",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#0284C7"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
        >
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #E2E8F0", padding: "32px" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center" style={{
              width: 24, height: 24, background: "#0EA5E9", borderRadius: 6,
            }}>
              <span style={{ color: "white", fontWeight: 800, fontSize: 11 }}>P</span>
            </div>
            <span style={{ fontWeight: 800, color: "#0F172A" }}>PropIQ</span>
          </div>
          <p style={{ fontSize: 12, color: "#94A3B8" }}>
            For research and informational purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
