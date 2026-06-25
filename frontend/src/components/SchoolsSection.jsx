function ratingColor(r) {
  if (r >= 8) return "#10B981";
  if (r >= 6) return "#F59E0B";
  return "#EF4444";
}

export default function SchoolsSection({ data }) {
  if (!data || !data.schools) return null;
  const { schools, district_score } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Nearby Schools</h3>
        {district_score && (
          <span style={{
            padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            color: ratingColor(district_score / 10),
            background: `${ratingColor(district_score / 10)}12`,
            border: `1px solid ${ratingColor(district_score / 10)}30`,
          }}>
            District {district_score}/100
          </span>
        )}
      </div>

      <div className="space-y-2">
        {schools.map((s, i) => (
          <div key={i} className="flex items-center gap-4" style={{
            background: "#F8FAFC", border: "1px solid #E2E8F0",
            borderRadius: 12, padding: 12,
          }}>
            <div className="flex items-center justify-center" style={{
              width: 40, height: 40, borderRadius: 12, fontSize: 13, fontWeight: 700,
              color: ratingColor(s.rating),
              background: `${ratingColor(s.rating)}12`,
              border: `1px solid ${ratingColor(s.rating)}30`,
            }}>
              {s.rating}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}>{s.name}</div>
              <div style={{ color: "#475569", fontSize: 12 }}>{s.type} · Grades {s.grades}</div>
            </div>
            <div style={{ color: "#94A3B8", fontSize: 12, textAlign: "right", flexShrink: 0 }}>
              {s.distance} mi
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
