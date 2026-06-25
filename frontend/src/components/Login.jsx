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

  const inputStyle = {
    width: "100%", borderRadius: 12, border: "1px solid #E2E8F0",
    background: "#F8FAFC", padding: "12px 16px", fontSize: 13,
    color: "#0F172A", outline: "none", transition: "border-color 150ms, box-shadow 150ms",
  };

  function onFocus(e) { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; }
  function onBlur(e) { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFC" }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={onBack} className="flex items-center gap-2 group">
          <div className="flex items-center justify-center" style={{
            width: 32, height: 32, background: "#0EA5E9", borderRadius: 8,
          }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>P</span>
          </div>
          <span style={{ fontWeight: 800, color: "#0F172A", fontSize: 20, letterSpacing: "-0.02em" }}>PropIQ</span>
        </button>
        <button onClick={onBack} style={{ fontSize: 13, color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>
          Back to home
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-4xl grid md:grid-cols-[1.1fr_0.9fr] gap-8">
          {/* Left panel */}
          <div style={{
            background: "#F0F9FF", border: "1px solid #BAE6FD",
            borderRadius: 16, padding: 40,
          }} className="flex flex-col justify-center">
            <div className="flex items-center justify-center mb-6" style={{
              width: 40, height: 40, background: "#0EA5E9", borderRadius: 12,
            }}>
              <span style={{ color: "white", fontWeight: 800, fontSize: 18 }}>P</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0C4A6E", marginBottom: 12, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Real Estate Intelligence.
              <br />
              <span style={{ color: "#0EA5E9" }}>Unbiased.</span>
            </h1>
            <p style={{ color: "#0369A1", fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
              Sign in to analyze properties, compare markets, and download
              professional investment reports -- with air quality, pollen, and
              flood data that Zillow removed.
            </p>
            <div className="space-y-4">
              {[
                { title: "Search Properties", desc: "AI scores for any US ZIP code" },
                { title: "Environmental Data", desc: "AQI, pollen, flood, wildfire" },
                { title: "PDF Reports", desc: "4-page professional export" },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#0EA5E9" }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0C4A6E" }}>{title}</p>
                    <p style={{ fontSize: 12, color: "#0369A1" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel -- form */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: 32 }}>
            <div className="flex gap-1 rounded-full p-1 mb-8" style={{ background: "#F1F5F9" }}>
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 rounded-full py-2 text-sm font-semibold transition"
                  style={{
                    background: mode === m ? "#0EA5E9" : "transparent",
                    color: mode === m ? "white" : "#94A3B8",
                  }}
                >
                  {m === "signup" ? "Sign Up" : "Login"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Full Name
                  </label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Password
                </label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="--------" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px" }}>{error}</p>
              )}

              <button type="submit" disabled={loading}
                className="w-full"
                style={{
                  marginTop: 8, borderRadius: 12, background: "#0EA5E9",
                  padding: "12px 20px", fontSize: 13, fontWeight: 700,
                  color: "white", border: "none", cursor: "pointer",
                  opacity: loading ? 0.5 : 1, transition: "background 150ms",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#0284C7"; }}
                onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
              >
                {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: "1px solid #E2E8F0" }} />
                </div>
                <div className="relative flex justify-center">
                  <span style={{ background: "white", padding: "0 12px", fontSize: 12, color: "#CBD5E1" }}>or</span>
                </div>
              </div>

              <button type="button" onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2"
                style={{
                  borderRadius: 12, border: "1px solid #E2E8F0", background: "white",
                  padding: "12px 20px", fontSize: 13, fontWeight: 600,
                  color: "#475569", cursor: "pointer", transition: "border-color 150ms, color 150ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0EA5E9"; e.currentTarget.style.color = "#0EA5E9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#475569"; }}
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
            <p style={{ marginTop: 20, fontSize: 12, color: "#CBD5E1", textAlign: "center" }}>
              Mock auth -- any email/password works for local development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
