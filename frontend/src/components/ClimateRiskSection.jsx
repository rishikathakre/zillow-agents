function RiskBar({ label, score, icon }) {
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-yellow-500" : "bg-green-500";
  const textColor = score >= 70 ? "text-red-700" : score >= 40 ? "text-yellow-700" : "text-green-700";
  const label2 = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-gray-700">
          <span>{icon}</span> {label}
        </span>
        <span className={`font-bold text-sm ${textColor}`}>{label2} ({score}/100)</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ClimateRiskSection({ data }) {
  if (!data) return null;
  const { flood_score = 30, wildfire_score = 20, wind_score = 40, heat_score = 50, insurance_status = "Standard rates", sfha_pct = 5 } = data;

  const overall = Math.round((flood_score + wildfire_score + wind_score + heat_score) / 4);
  const overallLabel = overall >= 70 ? { t: "High Risk", bg: "bg-red-100", text: "text-red-800", border: "border-red-200" }
    : overall >= 40 ? { t: "Moderate Risk", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" }
    : { t: "Low Risk", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-gray-900">Climate Risk</h3>

      <div className={`border rounded-xl p-3 ${overallLabel.bg} ${overallLabel.border}`}>
        <div className={`font-bold ${overallLabel.text}`}>Overall: {overallLabel.t}</div>
        <div className={`text-sm mt-0.5 ${overallLabel.text} opacity-80`}>Composite score: {overall}/100</div>
      </div>

      <div className="space-y-4">
        <RiskBar label="Flood Risk" score={flood_score} icon="🌊" />
        <RiskBar label="Wildfire Risk" score={wildfire_score} icon="🔥" />
        <RiskBar label="Wind / Hurricane Risk" score={wind_score} icon="💨" />
        <RiskBar label="Extreme Heat Risk" score={heat_score} icon="🌡️" />
      </div>

      <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">FEMA SFHA Zone</span>
          <span className="font-medium">{sfha_pct}% of area</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Insurance Status</span>
          <span className="font-medium">{insurance_status}</span>
        </div>
      </div>
    </div>
  );
}
