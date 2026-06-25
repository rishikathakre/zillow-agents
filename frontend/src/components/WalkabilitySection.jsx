function CircleGauge({ label, score, color }) {
  const r = 30, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 80 80" className="w-20 h-20">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
        <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0F172A">{score}</text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>{label}</span>
    </div>
  );
}

export default function WalkabilitySection({ data }) {
  if (!data) return null;
  const { walk_score = 70, transit_score = 60, bike_score = 55, amenities = [], crime_index = 45 } = data;

  const crimeColor = crime_index >= 70 ? "#EF4444" : crime_index >= 40 ? "#F59E0B" : "#10B981";
  const crimeLabel = crime_index >= 70 ? "High" : crime_index >= 40 ? "Moderate" : "Low";

  return (
    <div className="space-y-5">
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Walkability & Neighborhood</h3>

      {/* Score circles */}
      <div className="flex justify-around py-2">
        <CircleGauge label="Walk Score" score={walk_score} color="#0EA5E9" />
        <CircleGauge label="Transit Score" score={transit_score} color="#8b5cf6" />
        <CircleGauge label="Bike Score" score={bike_score} color="#10B981" />
      </div>

      {/* Crime index */}
      <div className="flex items-center justify-between" style={{
        background: "#F8FAFC", border: "1px solid #E2E8F0",
        borderRadius: 12, padding: 12,
      }}>
        <div>
          <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}>Crime Index</div>
          <div style={{ color: "#94A3B8", fontSize: 12 }}>Higher = more crime relative to national avg</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: crimeColor }}>{crimeLabel} ({crime_index})</div>
      </div>

      {/* Amenities */}
      {amenities.length > 0 && (
        <div>
          <h4 style={{ fontWeight: 600, color: "#0F172A", marginBottom: 12, fontSize: 13 }}>Nearby Amenities</h4>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((a, i) => (
              <div key={i} className="flex items-center gap-2" style={{
                background: "#F8FAFC", border: "1px solid #E2E8F0",
                borderRadius: 12, padding: 12,
              }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#0EA5E9" }} />
                <div className="min-w-0">
                  <div className="truncate" style={{ color: "#0F172A", fontSize: 13, fontWeight: 500 }}>{a.type}</div>
                  <div style={{ color: "#94A3B8", fontSize: 12 }}>{a.count} within {a.distance} mi</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
