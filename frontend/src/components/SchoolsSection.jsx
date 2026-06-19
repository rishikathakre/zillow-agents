function ratingColor(r) {
  if (r >= 8) return "text-green-600 bg-green-100";
  if (r >= 6) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

function stars(r) {
  const full = Math.round(r / 2);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function SchoolsSection({ data }) {
  if (!data || !data.schools) return null;
  const { schools, district_score } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Nearby Schools</h3>
        {district_score && (
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${ratingColor(district_score / 10)}`}>
            District {district_score}/100
          </div>
        )}
      </div>

      <div className="space-y-3">
        {schools.map((s, i) => (
          <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-xl p-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${ratingColor(s.rating)}`}>
              {s.rating}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{s.name}</div>
              <div className="text-gray-500 text-xs">{s.type} · Grades {s.grades}</div>
              <div className="text-yellow-500 text-xs">{stars(s.rating)}</div>
            </div>
            <div className="text-gray-400 text-xs text-right shrink-0">
              {s.distance} mi
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
