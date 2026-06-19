import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AQI_COLORS = {
  Good: "bg-green-100 text-green-700 border-green-200",
  Moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Unhealthy for Sensitive Groups": "bg-orange-100 text-orange-700 border-orange-200",
  Unhealthy: "bg-red-100 text-red-700 border-red-200",
  "Very Unhealthy": "bg-purple-100 text-purple-700 border-purple-200",
  Hazardous: "bg-red-200 text-red-800 border-red-300",
};

function AqiGauge({ value }) {
  const pct = Math.min(100, Math.max(0, (value / 300) * 100));
  const color = value <= 50 ? "#16a34a" : value <= 100 ? "#eab308" : value <= 150 ? "#f97316" : "#dc2626";
  return (
    <div className="flex items-center gap-3">
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      <div className="flex-1">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0 Good</span><span>100 Mod.</span><span>200 Unhealthy</span><span>300+</span>
        </div>
      </div>
    </div>
  );
}

function PollenLevel({ label, level }) {
  const colors = { High: "text-red-600 bg-red-50", Moderate: "text-amber-600 bg-amber-50", Low: "text-green-600 bg-green-50" };
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors[level] || "text-slate-600 bg-slate-100"}`}>{level}</span>
    </div>
  );
}

const MONTH_KEYS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const POLLEN_COLORS = ["#bbf7d0","#86efac","#4ade80","#22c55e","#16a34a","#15803d","#166534","#14532d","#052e16","#022c22","#052e16","#166534"];

export default function EnvironmentalTab({ result }) {
  if (!result) return null;
  const aqi = result.air_quality_detail || {};
  const pollen = result.pollen_calendar || {};
  const climate = result.climate_details || {};
  const trend = result.aqi_trend || [];

  const aqiClass = AQI_COLORS[aqi.category] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="space-y-7">
      {/* AIR QUALITY */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">🌬️ Air Quality (AQI)</h3>
          <span className={`text-xs font-semibold border px-3 py-1 rounded-full ${aqiClass}`}>{aqi.category || "N/A"}</span>
        </div>
        {aqi.aqi_value != null && <AqiGauge value={aqi.aqi_value} />}

        {/* Pollutant breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
          {[
            { label: "PM2.5", value: aqi.pm25, unit: "μg/m³" },
            { label: "Ozone", value: aqi.ozone, unit: "ppb" },
            { label: "NO₂", value: aqi.no2, unit: "ppb" },
            { label: "CO", value: aqi.co, unit: "ppm" },
            { label: "SO₂", value: aqi.so2, unit: "ppb" },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="text-lg font-black text-slate-900 mt-1">{value ?? "—"}</p>
              <p className="text-xs text-slate-400">{unit}</p>
            </div>
          ))}
        </div>

        {/* 30-day trend */}
        {trend.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-500 mb-2">30-Day AQI Trend</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} interval={6} />
                <YAxis tick={{ fontSize: 9 }} width={30} domain={[0, "auto"]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} labelFormatter={(d) => `Date: ${d}`} />
                <Line type="monotone" dataKey="aqi" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {aqi.health_recommendation && (
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
            💡 {aqi.health_recommendation}
          </div>
        )}

        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
          🏠 Poor air quality reduces livability scores and is linked to lower long-term property demand.
        </div>
      </div>

      {/* POLLEN */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">🌿 Pollen Index</h3>
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <PollenLevel label="🌳 Tree Pollen" level={pollen.tree_level || "N/A"} />
          <PollenLevel label="🌿 Grass Pollen" level={pollen.grass_level || "N/A"} />
          <PollenLevel label="🌾 Weed Pollen" level={pollen.weed_level || "N/A"} />
        </div>

        {/* Monthly heatmap */}
        {pollen.monthly && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Monthly Pollen Calendar</p>
            <div className="grid grid-cols-12 gap-1">
              {MONTH_KEYS.map((m) => {
                const val = pollen.monthly[m] ?? 0;
                const idx = Math.min(POLLEN_COLORS.length - 1, Math.round(val));
                return (
                  <div key={m} className="text-center">
                    <div
                      className="h-8 rounded-md flex items-center justify-center text-xs font-semibold"
                      style={{
                        backgroundColor: `hsl(${120 - val * 12}, 70%, ${75 - val * 3}%)`,
                        color: val > 6 ? "#fff" : "#374151",
                      }}
                      title={`${m}: ${val}/10`}
                    >
                      {val}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{m}</p>
                  </div>
                );
              })}
            </div>
            {pollen.worst_months?.length > 0 && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                ⚠️ Worst months: {pollen.worst_months.join(", ")}
              </p>
            )}
            {pollen.best_months?.length > 0 && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✅ Best months to visit: {pollen.best_months.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CLIMATE RISK */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">🌊 Climate Risk</h3>
          <span className="text-xs text-slate-400">Data Zillow removed in Nov 2025</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Flood Risk", value: `${climate.flood_risk_score ?? "N/A"}/100`, sub: `Zone ${climate.flood_zone || "N/A"}` },
            { label: "Wildfire Risk", value: `${climate.wildfire_risk_score ?? "N/A"}/100`, sub: "Relative score" },
            { label: "Extreme Heat Days", value: `${climate.heat_days_per_year ?? "N/A"}`, sub: "Days/year" },
            { label: "Wind Risk", value: `${climate.wind_risk_score ?? "N/A"}/100`, sub: "Relative score" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="text-lg font-black text-slate-900 mt-1">{value}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          climate.insurance_available
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {climate.insurance_available ? "✅" : "⚠️"} {climate.insurance_note || "Insurance data unavailable"}
        </div>

        <div className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          📋 <span className="font-semibold">Note:</span> Zillow removed climate and flood risk data in November 2025 under industry pressure. PropIQ shows it transparently.
        </div>
      </div>
    </div>
  );
}
