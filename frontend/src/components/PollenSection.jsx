const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function levelColor(v) {
  if (v <= 2) return "bg-green-200 text-green-800";
  if (v <= 4) return "bg-yellow-200 text-yellow-800";
  if (v <= 6) return "bg-orange-200 text-orange-800";
  if (v <= 8) return "bg-red-200 text-red-800";
  return "bg-purple-200 text-purple-800";
}

function levelLabel(v) {
  if (v <= 2) return "Low";
  if (v <= 4) return "Moderate";
  if (v <= 6) return "High";
  if (v <= 8) return "Very High";
  return "Extreme";
}

function PollenType({ label, icon, value, monthly }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-gray-800">{label}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${levelColor(Math.round(value / 10))}`}>
          {levelLabel(Math.round(value / 10))} ({value})
        </span>
      </div>
      <div className="grid grid-cols-12 gap-0.5">
        {(monthly || []).map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className={`w-full h-5 rounded ${levelColor(Math.round(v / 10))}`} title={`${MONTHS[i]}: ${v}`} />
            <span className="text-gray-400 text-[9px]">{MONTHS[i][0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PollenSection({ data }) {
  if (!data) return null;
  const { tree = 50, grass = 50, weed = 50, monthly_tree = [], monthly_grass = [], monthly_weed = [] } = data;

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-gray-900">Pollen Forecast</h3>
      <PollenType label="Tree Pollen" icon="🌳" value={tree} monthly={monthly_tree} />
      <PollenType label="Grass Pollen" icon="🌿" value={grass} monthly={monthly_grass} />
      <PollenType label="Weed Pollen" icon="🌾" value={weed} monthly={monthly_weed} />
      <p className="text-xs text-gray-400">Pollen index 0–120. Monthly heatmap shows seasonal variation across the year.</p>
    </div>
  );
}
