function RiskBar({ label, score }) {
  const color = score >= 70 ? "#EF4444" : score >= 40 ? "#F59E0B" : "#10B981";
  const riskLabel = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
        <span style={{ fontWeight: 500, color: "#475569" }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color }}>{riskLabel} ({score}/100)</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function ClimateRiskSection({ data }) {
  if (!data) return null;
  const { flood_score = 30, wildfire_score = 20, wind_score = 40, heat_score = 50, insurance_status = "Standard rates", sfha_pct = 5 } = data;

  const overall = Math.round((flood_score + wildfire_score + wind_score + heat_score) / 4);
  const overallColor = overall >= 70 ? "#EF4444" : overall >= 40 ? "#F59E0B" : "#10B981";
  const overallLabel = overall >= 70 ? "High Risk" : overall >= 40 ? "Moderate Risk" : "Low Risk";

  return (
    <div className="space-y-5">
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Climate Risk</h3>

      <div style={{
        borderRadius: 12, padding: 12,
        background: `${overallColor}08`, border: `1px solid ${overallColor}30`,
      }}>
        <div style={{ fontWeight: 700, color: overallColor }}>Overall: {overallLabel}</div>
        <div style={{ fontSize: 13, marginTop: 2, color: "#475569" }}>Composite score: {overall}/100</div>
      </div>

      <div className="space-y-4">
        <RiskBar label="Flood Risk" score={flood_score} />
        <RiskBar label="Wildfire Risk" score={wildfire_score} />
        <RiskBar label="Wind / Hurricane Risk" score={wind_score} />
        <RiskBar label="Extreme Heat Risk" score={heat_score} />
      </div>

      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 12, fontSize: 13 }} className="space-y-1">
        <div className="flex justify-between">
          <span style={{ color: "#94A3B8" }}>FEMA SFHA Zone</span>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{sfha_pct}% of area</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "#94A3B8" }}>Insurance Status</span>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{insurance_status}</span>
        </div>
      </div>
    </div>
  );
}
