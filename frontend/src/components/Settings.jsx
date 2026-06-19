import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";

const WEIGHT_KEYS = [
  { key: "price_score", label: "Price Momentum", icon: "📈" },
  { key: "neighborhood_score", label: "Neighborhood Quality", icon: "🏘️" },
  { key: "rental_yield", label: "Rental Yield", icon: "💰" },
  { key: "forecast_score", label: "12-Month Forecast", icon: "🔮" },
  { key: "aqi_score", label: "Air Quality (AQI)", icon: "🌬️" },
  { key: "pollen_score", label: "Pollen Index", icon: "🌿" },
  { key: "airbnb_score", label: "Airbnb STR Yield", icon: "🏡" },
  { key: "climate_risk_score", label: "Climate Risk", icon: "🌊" },
];

const DEFAULT_WEIGHTS = {
  price_score: 25, neighborhood_score: 20, rental_yield: 15,
  forecast_score: 15, aqi_score: 10, pollen_score: 5,
  airbnb_score: 5, climate_risk_score: 5,
};

export default function Settings() {
  const { user, logout } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    openai_key: "", airnow_key: "", rapidapi_key: "",
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your profile, API keys, and scoring weights.</p>
      </div>

      {/* Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {(user?.name || "U")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Display Name</label>
            <input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
            <input
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition"
            />
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm font-semibold text-red-600 hover:text-red-800 transition"
        >
          Log Out
        </button>
      </div>

      {/* API Keys */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-1">API Keys</h2>
        <p className="text-xs text-slate-400 mb-4">Keys are stored server-side in your .env file and never exposed to the browser.</p>

        {/* Required */}
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Required</p>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={apiKeys.openai_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, openai_key: e.target.value }))}
              placeholder="sk-proj-..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">Powers the LangGraph 8-agent analysis pipeline (GPT-4o-mini)</p>
          </div>
        </div>

        {/* Data sources */}
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Live Data Sources</p>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Zillow56 RapidAPI Key
              <span className="ml-2 text-amber-600 font-normal">— real listings &amp; photos</span>
            </label>
            <input
              type="password"
              value={apiKeys.rapidapi_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, rapidapi_key: e.target.value }))}
              placeholder="your-rapidapi-key"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Get at{" "}
              <a href="https://rapidapi.com/s.mahmoud97/api/zillow56" target="_blank" rel="noreferrer"
                className="text-blue-500 hover:underline">
                rapidapi.com → Zillow56
              </a>
              . Without this, PropIQ uses mock listings.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              OpenWeatherMap API Key
              <span className="ml-2 text-amber-600 font-normal">— weather &amp; 7-day forecast</span>
            </label>
            <input
              type="password"
              value={apiKeys.openweather_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, openweather_key: e.target.value }))}
              placeholder="owm-..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Free tier at{" "}
              <a href="https://openweathermap.org/api" target="_blank" rel="noreferrer"
                className="text-blue-500 hover:underline">
                openweathermap.org
              </a>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              AirNow API Key
              <span className="ml-2 text-green-600 font-normal">— EPA official AQI (free)</span>
            </label>
            <input
              type="password"
              value={apiKeys.airnow_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, airnow_key: e.target.value }))}
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Free at{" "}
              <a href="https://docs.airnowapi.org/" target="_blank" rel="noreferrer"
                className="text-blue-500 hover:underline">
                airnowapi.org
              </a>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Google Maps API Key
              <span className="ml-2 text-amber-600 font-normal">— Places &amp; Pollen APIs</span>
            </label>
            <input
              type="password"
              value={apiKeys.google_maps_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, google_maps_key: e.target.value }))}
              placeholder="AIza..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Enable <strong>Places API</strong> + <strong>Pollen API</strong> at{" "}
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer"
                className="text-blue-500 hover:underline">
                console.cloud.google.com
              </a>
              . $200/mo free credit covers typical usage.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Walk Score API Key
              <span className="ml-2 text-slate-400 font-normal">— optional (computed from Places if absent)</span>
            </label>
            <input
              type="password"
              value={apiKeys.walkscore_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, walkscore_key: e.target.value }))}
              placeholder="ws-..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Free at{" "}
              <a href="https://www.walkscore.com/professional/api.php" target="_blank" rel="noreferrer"
                className="text-blue-500 hover:underline">
                walkscore.com/professional/api
              </a>
              . Without this key, walkability is computed from Google Places distances.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              BLS API Key
              <span className="ml-2 text-green-600 font-normal">— employment data (free)</span>
            </label>
            <input
              type="password"
              value={apiKeys.bls_key}
              onChange={(e) => setApiKeys((k) => ({ ...k, bls_key: e.target.value }))}
              placeholder="your-bls-key"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Free at{" "}
              <a href="https://data.bls.gov/registrationEngine/" target="_blank" rel="noreferrer"
                className="text-blue-500 hover:underline">
                data.bls.gov/registrationEngine
              </a>
              . Shows county unemployment rate + 24-month trend.
            </p>
          </div>
        </div>

        {/* Note: FEMA is always free */}
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <span className="text-green-600 text-lg leading-none mt-0.5">🏛️</span>
          <div>
            <p className="text-xs font-semibold text-green-800">FEMA Flood Zone data is always live — no key required.</p>
            <p className="text-xs text-green-700 mt-0.5">PropIQ queries the FEMA National Flood Hazard Layer API for every property automatically.</p>
          </div>
        </div>

        <button
          onClick={saveKeys}
          disabled={keySaving}
          className="bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
        >
          {keySaved ? "✓ Saved!" : keySaving ? "Saving..." : "Save Keys"}
        </button>
      </div>

      {/* Scoring weights */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-900">Scoring Weights</h2>
          <button onClick={resetWeights} className="text-xs text-slate-400 hover:text-slate-700 transition">
            Reset to defaults
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Adjust how much each agent contributes to the overall score. Must sum to 100%.
        </p>

        <div className="space-y-4">
          {WEIGHT_KEYS.map(({ key, label, icon }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{icon} {label}</span>
                <span className="text-sm font-bold text-slate-900">{weights[key] ?? 0}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={weights[key] ?? 0}
                onChange={(e) => handleWeightChange(key, e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
              />
            </div>
          ))}
        </div>

        <div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${weightOk ? "text-green-600" : "text-amber-600"}`}>
          <span className={`w-3 h-3 rounded-full ${weightOk ? "bg-green-500" : "bg-amber-500"}`} />
          Total: {totalWeight}% {weightOk ? "(valid)" : "(must equal 100%)"}
        </div>
      </div>

      {/* Notifications (UI only) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Notification Preferences</h2>
        <div className="space-y-3">
          {[
            "Email me when a new analysis is complete",
            "Alert me when AQI exceeds 100 in tracked ZIPs",
            "Weekly market summary digest",
          ].map((label) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked={false} className="w-4 h-4 accent-slate-900 rounded" />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">Notifications are UI-only in this version.</p>
      </div>
    </div>
  );
}
