import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";

const WEIGHT_KEYS = [
  { key: "price_score", label: "Price Momentum" },
  { key: "neighborhood_score", label: "Neighborhood Quality" },
  { key: "rental_yield", label: "Rental Yield" },
  { key: "forecast_score", label: "12-Month Forecast" },
  { key: "aqi_score", label: "Air Quality (AQI)" },
  { key: "pollen_score", label: "Pollen Index" },
  { key: "airbnb_score", label: "Airbnb STR Yield" },
  { key: "climate_risk_score", label: "Climate Risk" },
];

const DEFAULT_WEIGHTS = {
  price_score: 25, neighborhood_score: 20, rental_yield: 15,
  forecast_score: 15, aqi_score: 10, pollen_score: 5,
  airbnb_score: 5, climate_risk_score: 5,
};

export default function Settings() {
  const { user, logout } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    openai_key: "", airnow_key: "", rentcast_key: "",
    openweather_key: "", google_maps_key: "", walkscore_key: "", bls_key: "",
  });
  const [keySaving, setKeySaving] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [weights, setWeights] = useState(() => {
    try {
      const raw = localStorage.getItem("propiq-weights");
      return raw ? JSON.parse(raw) : DEFAULT_WEIGHTS;
    } catch { return DEFAULT_WEIGHTS; }
  });
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });

  useEffect(() => {
    api.get("/settings/keys")
      .then(({ data }) => setApiKeys(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem("propiq-weights", JSON.stringify(weights));
  }, [weights]);

  const totalWeight = Object.values(weights).reduce((s, v) => s + Number(v), 0);
  const weightOk = Math.abs(totalWeight - 100) < 1;

  function handleWeightChange(key, value) {
    setWeights((prev) => ({ ...prev, [key]: Number(value) }));
  }

  async function saveKeys() {
    setKeySaving(true);
    try {
      await api.post("/settings/keys", apiKeys);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    } catch {
      alert("Failed to save keys.");
    } finally {
      setKeySaving(false);
    }
  }

  function resetWeights() {
    setWeights(DEFAULT_WEIGHTS);
  }

  const inputClass = "w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none transition";
  const inputStyle = {
    background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#0F172A",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Manage your profile, API keys, and scoring weights.</p>
      </div>

      {/* Profile */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center justify-center flex-shrink-0" style={{
            width: 48, height: 48, background: "#F0F9FF", border: "1px solid #BAE6FD",
            borderRadius: "50%",
          }}>
            <span style={{ color: "#0C4A6E", fontWeight: 700, fontSize: 18 }}>
              {(user?.name || "U")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p style={{ fontWeight: 700, color: "#0F172A" }}>{user?.name}</p>
            <p style={{ fontSize: 13, color: "#475569" }}>{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 4 }}>Display Name</label>
            <input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className={inputClass}
              style={{ ...inputStyle, fontFamily: "inherit" }}
              onFocus={(e) => { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 4 }}>Email</label>
            <input
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className={inputClass}
              style={{ ...inputStyle, fontFamily: "inherit" }}
              onFocus={(e) => { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>
        <button onClick={logout} style={{ fontSize: 13, fontWeight: 600, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>
          Log Out
        </button>
      </div>

      {/* API Keys */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>API Keys</h2>
        <p style={{ fontSize: 11, color: "#CBD5E1", marginBottom: 16 }}>Keys are stored server-side in your .env file and never exposed to the browser.</p>

        <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Required</p>
        <div className="space-y-3 mb-5">
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>
              OpenAI API Key
              <span style={{ marginLeft: 8, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#0369A1" }}>Required</span>
            </label>
            <input type="password" value={apiKeys.openai_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, openai_key: e.target.value }))}
              placeholder="sk-proj-..."
              className={inputClass} style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
            />
            <p style={{ fontSize: 11, color: "#CBD5E1", marginTop: 4 }}>Powers the LangGraph 8-agent analysis pipeline (GPT-4o-mini)</p>
          </div>
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Live Data Sources</p>
        <div className="space-y-3 mb-5">
          {[
            { key: "rentcast_key", label: "RentCast API Key", badge: "real property listings", badgeColor: "#F59E0B", placeholder: "your-rentcast-key",
              help: <>Free at <a href="https://rentcast.io/api" target="_blank" rel="noreferrer" style={{ color: "#0EA5E9" }}>rentcast.io/api</a> -- 50 calls/month.</> },
            { key: "openweather_key", label: "OpenWeatherMap API Key", badge: "weather and 7-day forecast", badgeColor: "#F59E0B", placeholder: "owm-...",
              help: <>Free tier at <a href="https://openweathermap.org/api" target="_blank" rel="noreferrer" style={{ color: "#0EA5E9" }}>openweathermap.org</a></> },
            { key: "airnow_key", label: "AirNow API Key", badge: "EPA official AQI (free)", badgeColor: "#10B981", placeholder: "XXXXXXXX-XXXX-...",
              help: <>Free at <a href="https://docs.airnowapi.org/" target="_blank" rel="noreferrer" style={{ color: "#0EA5E9" }}>airnowapi.org</a></> },
            { key: "google_maps_key", label: "Google Maps API Key", badge: "Places and Pollen APIs", badgeColor: "#F59E0B", placeholder: "AIza...",
              help: <>Enable Places API + Pollen API at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: "#0EA5E9" }}>console.cloud.google.com</a>. $200/mo free credit.</> },
            { key: "walkscore_key", label: "Walk Score API Key", badge: "optional", badgeColor: "#94A3B8", placeholder: "ws-...",
              help: <>Free at <a href="https://www.walkscore.com/professional/api.php" target="_blank" rel="noreferrer" style={{ color: "#0EA5E9" }}>walkscore.com</a>. Without this key, walkability is computed from Google Places.</> },
          ].map(item => (
            <div key={item.key}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>
                {item.label}
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: item.badgeColor }}>-- {item.badge}</span>
              </label>
              <input type="password" value={apiKeys[item.key]}
                onChange={(e) => setApiKeys((k) => ({ ...k, [item.key]: e.target.value }))}
                placeholder={item.placeholder}
                className={inputClass} style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
              />
              <p style={{ fontSize: 11, color: "#CBD5E1", marginTop: 4 }}>{item.help}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Optional</p>
        <div className="space-y-3 mb-5">
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>
              BLS API Key
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: "#94A3B8" }}>-- employment data (optional)</span>
            </label>
            <input type="password" value={apiKeys.bls_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, bls_key: e.target.value }))}
              placeholder="your-bls-key"
              className={inputClass} style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
            />
            <p style={{ fontSize: 11, color: "#CBD5E1", marginTop: 4 }}>
              Free at <a href="https://data.bls.gov/registrationEngine/" target="_blank" rel="noreferrer" style={{ color: "#0EA5E9" }}>data.bls.gov</a> -- optional, powers employment charts.
            </p>
          </div>
        </div>

        {/* FEMA note */}
        <div className="flex items-start gap-2 mb-4" style={{
          background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 12, padding: "12px 16px",
        }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>FEMA Flood Zone data is always live -- no key required.</p>
            <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>PropIQ queries the FEMA National Flood Hazard Layer API for every property automatically.</p>
          </div>
        </div>

        <button onClick={saveKeys} disabled={keySaving}
          style={{
            background: "#0EA5E9", color: "white", border: "none", borderRadius: 7,
            padding: "10px 16px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            opacity: keySaving ? 0.5 : 1, transition: "background 150ms",
          }}
          onMouseEnter={(e) => { if (!keySaving) e.currentTarget.style.background = "#0284C7"; }}
          onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
        >
          {keySaved ? "Saved" : keySaving ? "Saving..." : "Save Keys"}
        </button>
      </div>

      {/* Scoring weights */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Scoring Weights</h2>
          <button onClick={resetWeights} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>
            Reset to defaults
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>
          Adjust how much each agent contributes to the overall score. Must sum to 100%.
        </p>

        <div className="space-y-5">
          {WEIGHT_KEYS.map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0EA5E9" }}>{weights[key] ?? 0}%</span>
              </div>
              <input
                type="range" min={0} max={50}
                value={weights[key] ?? 0}
                onChange={(e) => handleWeightChange(key, e.target.value)}
                className="w-full"
                style={{ accentColor: "#0EA5E9" }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4" style={{ fontSize: 13, fontWeight: 600, color: weightOk ? "#10B981" : "#F59E0B" }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: weightOk ? "#10B981" : "#F59E0B" }} />
          Total: {totalWeight}% {weightOk ? "(valid)" : "(must equal 100%)"}
        </div>
      </div>
    </div>
  );
}
