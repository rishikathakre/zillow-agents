const AGENTS = [
  { key: "price_score", label: "Price Momentum", icon: "📈" },
  { key: "neighborhood_score", label: "Neighborhood Quality", icon: "🏘️" },
  { key: "rental_yield", label: "Rental Yield", icon: "💰" },
  { key: "forecast_score", label: "12-Month Forecast", icon: "🔮" },
  { key: "aqi_score", label: "Air Quality (AQI)", icon: "🌬️" },
  { key: "pollen_score", label: "Pollen Index", icon: "🌿" },
  { key: "airbnb_score", label: "Airbnb STR Yield", icon: "🏡" },
  { key: "climate_risk_score", label: "Climate Risk", icon: "🌊" },
];

function barColor(v) {
  if (v >= 70) return "bg-green-500";
  if (v >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function textColor(v) {
  if (v >= 70) return "text-green-600";
  if (v >= 40) return "text-amber-600";
  return "text-red-600";
}

export default function ScoreBars({ scores }) {
  return (
    <div className="space-y-3">
      {AGENTS.map(({ key, label, icon }) => {
        const value = Number(scores?.[key] ?? 0);
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-base w-6 flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600 truncate">{label}</span>
                <span className={`text-xs font-bold ml-2 flex-shrink-0 ${textColor(value)}`}>{value.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${barColor(value)}`}
                  style={{ width: `${Math.max(2, value)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
