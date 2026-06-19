function StatCard({ label, value, sub, badge }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-xl font-black text-slate-900">{value}</p>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-0.5 ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ScoreBar({ label, value, max = 100 }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-600 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-900 w-8 text-right">{value}</span>
    </div>
  );
}

function TrendBadge({ trend, positiveLabel, negativeLabel }) {
  const isGood = trend === "up" || trend === "improving";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      isGood ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}>
      {isGood ? `↑ ${positiveLabel}` : `↓ ${negativeLabel}`}
    </span>
  );
}

const TRAJECTORIES = {
  rising: { color: "bg-green-100 text-green-700", label: "📈 Rising" },
  stable: { color: "bg-blue-100 text-blue-700", label: "→ Stable" },
  declining: { color: "bg-red-100 text-red-700", label: "📉 Declining" },
};

export default function NeighborhoodTab({ result }) {
  if (!result) return null;
  const n = result.neighborhood_details || {};

  const trajectory = TRAJECTORIES[n.trajectory] || { color: "bg-slate-100 text-slate-700", label: n.trajectory || "N/A" };

  return (
    <div className="space-y-6">
      {/* Trajectory badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Neighborhood Overview</h3>
        <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${trajectory.color}`}>
          {trajectory.label}
        </span>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">School Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-black text-slate-900">{n.school_rating ?? "N/A"}</p>
            {n.school_trend && <TrendBadge trend={n.school_trend} positiveLabel="Improving" negativeLabel="Declining" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">out of 10</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Crime Index</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-black text-slate-900">{n.crime_index ?? "N/A"}</p>
            {n.crime_trend && <TrendBadge trend={n.crime_trend} positiveLabel="Improving" negativeLabel="Worsening" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">lower is safer</p>
        </div>

        <StatCard
          label="Population"
          value={n.population ? n.population.toLocaleString() : "N/A"}
          sub="Estimated"
        />
        <StatCard
          label="Median Income"
          value={n.median_income ? `$${n.median_income.toLocaleString()}` : "N/A"}
          sub="Annual household"
        />
      </div>

      {/* Walkability scores */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Mobility Scores</h3>
        <div className="space-y-2">
          <ScoreBar label="🚶 Walkability" value={n.walk_score ?? 0} />
          <ScoreBar label="🚌 Transit" value={n.transit_score ?? 0} />
          <ScoreBar label="🚲 Biking" value={n.bike_score ?? 0} />
        </div>
      </div>

      {/* Nearby amenities */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Nearby Amenities</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "🛒", label: "Grocery Stores", value: n.grocery_stores },
            { icon: "🏥", label: "Hospitals", value: n.hospitals },
            { icon: "🌳", label: "Parks", value: n.parks },
            { icon: "🍽️", label: "Restaurants", value: n.restaurants },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-xl font-black text-slate-900">{value ?? "N/A"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Demographics */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Demographic Snapshot</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Median Age" value={n.median_age ?? "N/A"} sub="Years" />
          <StatCard label="Median Household Income" value={n.median_income ? `$${n.median_income.toLocaleString()}` : "N/A"} sub="Per year" />
        </div>
      </div>
    </div>
  );
}
