const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function levelMeta(v) {
  if (v <= 2) return { color: "#10B981", label: "Low" };
  if (v <= 4) return { color: "#F59E0B", label: "Moderate" };
  if (v <= 6) return { color: "#f97316", label: "High" };
  if (v <= 8) return { color: "#EF4444", label: "Very High" };
  return { color: "#7c3aed", label: "Extreme" };
}

function PollenType({ label, value, monthly }) {
  const meta = levelMeta(Math.round(value / 10));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}>{label}</span>
        <span style={{
          padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
          color: meta.color,
        }}>
          {meta.label} ({value})
        </span>
      </div>
      <div className="grid grid-cols-12 gap-0.5">
        {(monthly || []).map((v, i) => {
          const m = levelMeta(Math.round(v / 10));
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-full h-5 rounded" style={{ background: `${m.color}25` }} title={`${MONTHS[i]}: ${v}`} />
              <span style={{ color: "#CBD5E1", fontSize: 9 }}>{MONTHS[i][0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PollenSection({ data }) {
  if (!data) return null;
  const { tree = 50, grass = 50, weed = 50, monthly_tree = [], monthly_grass = [], monthly_weed = [] } = data;

  return (
    <div className="space-y-5">
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Pollen Forecast</h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tree", value: tree, level: levelMeta(Math.round(tree / 10)) },
          { label: "Grass", value: grass, level: levelMeta(Math.round(grass / 10)) },
          { label: "Weed", value: weed, level: levelMeta(Math.round(weed / 10)) },
        ].map(p => (
          <div key={p.label} style={{
            background: "#F0F9FF", border: "1px solid #BAE6FD",
            borderRadius: 12, padding: 16, textAlign: "center",
          }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "#0369A1" }}>{p.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0C4A6E", marginTop: 8 }}>{p.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: p.level.color, marginTop: 4 }}>{p.level.label}</div>
          </div>
        ))}
      </div>
      <PollenType label="Tree Pollen" value={tree} monthly={monthly_tree} />
      <PollenType label="Grass Pollen" value={grass} monthly={monthly_grass} />
      <PollenType label="Weed Pollen" value={weed} monthly={monthly_weed} />
      <p style={{ fontSize: 12, color: "#CBD5E1" }}>Pollen index 0-120. Monthly heatmap shows seasonal variation across the year.</p>
    </div>
  );
}
