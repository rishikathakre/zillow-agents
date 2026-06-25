const AGENTS = [
  { key: "price_score", label: "Price Momentum" },
  { key: "neighborhood_score", label: "Neighborhood Quality" },
  { key: "rental_yield", label: "Rental Yield" },
  { key: "forecast_score", label: "12-Month Forecast" },
  { key: "aqi_score", label: "Air Quality (AQI)" },
  { key: "pollen_score", label: "Pollen Index" },
  { key: "airbnb_score", label: "Airbnb STR Yield" },
  { key: "climate_risk_score", label: "Climate Risk" },
];

function barColor(v) {
  if (v >= 70) return "#10B981";
  if (v >= 40) return "#F59E0B";
  return "#EF4444";
}

function textColor(v) {
  if (v >= 70) return "#065F46";
  if (v >= 40) return "#92400E";
  return "#991B1B";
}

export default function ScoreBars({ scores }) {
  return (
    <div className="space-y-3">
      {AGENTS.map(({ key, label }) => {
        const value = Number(scores?.[key] ?? 0);
        return (
          <div key={key} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#E2E8F0" }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="truncate" style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>{label}</span>
                <span className="ml-2 flex-shrink-0" style={{ fontSize: 12, fontWeight: 700, color: textColor(value) }}>{value.toFixed(0)}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(2, value)}%`, background: barColor(value) }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
