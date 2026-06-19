import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";

export default function Login({ onBack }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
      const { data } = await api.post(endpoint, { name, email, password });
      login(data.token, data.user);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100">
        <button onClick={onBack} className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">P</span>
          </div>
          <span className="font-black text-slate-900 text-xl tracking-tight">PropIQ</span>
        </button>
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 transition">
          ← Back to home
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-4xl grid md:grid-cols-[1.1fr_0.9fr] gap-8">
          {/* Left panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col justify-center">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-3 leading-tight">
              Real Estate Intelligence.
              <br />
              <span className="text-green-600">Unbiased.</span>
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Sign in to analyze properties, compare markets, and download
              professional investment reports — with air quality, pollen, and
              flood data that Zillow removed.
            </p>
            <div className="space-y-4">
              {[
                { icon: "🏠", title: "Search Properties", desc: "AI scores for any US ZIP code" },
                { icon: "🌬️", title: "Environmental Data", desc: "AQI, pollen, flood, wildfire" },
                { icon: "📄", title: "PDF Reports", desc: "4-page professional export" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — form */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <div className="flex gap-1 bg-slate-800 rounded-full p-1 mb-8">
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(""); }}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                    mode === m ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m === "signup" ? "Sign Up" : "Login"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500 transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-full bg-green-500 hover:bg-green-400 disabled:opacity-60 px-5 py-3 text-sm font-bold text-white transition"
              >
                {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-900 px-3 text-xs text-slate-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full rounded-full border border-slate-700 hover:border-slate-500 px-5 py-3 text-sm font-semibold text-slate-300 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>
            <p className="mt-5 text-xs text-slate-500 text-center">
              Mock auth — any email/password works for local development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
