import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function aqiMeta(v) {
  if (v <= 50) return { label: "Good", color: "#10B981", msg: "Air quality is satisfactory, and air pollution poses little or no risk." };
  if (v <= 100) return { label: "Moderate", color: "#F59E0B", msg: "Air quality is acceptable. Unusually sensitive people should consider limiting prolonged outdoor exertion." };
  if (v <= 150) return { label: "Unhealthy for Sensitive", color: "#f97316", msg: "Members of sensitive groups may experience health effects. General public is not likely to be affected." };
  if (v <= 200) return { label: "Unhealthy", color: "#EF4444", msg: "Everyone may begin to experience health effects. Sensitive groups may experience more serious effects." };
  return { label: "Very Unhealthy", color: "#7c3aed", msg: "Health alert: everyone may experience more serious health effects." };
}

function PollutantBar({ name, value, max, unit, color }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, width: 64, flexShrink: 0 }}>{name}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
      </div>
      <span style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", width: 80 }}>{value} {unit}</span>
    </div>
  );
}

export default function AQISection({ data }) {
  if (!data) return null;
  const { aqi_value, pollutants = {}, trend = [] } = data;
  const meta = aqiMeta(aqi_value);

  const angle = ((aqi_value / 300) * 180);
  const r = 70, cx = 90, cy = 90;
  const rad = (a) => ((a - 90) * Math.PI) / 180;
  const needle = {
    x: cx + r * 0.7 * Math.cos(rad(angle - 90)),
    y: cy + r * 0.7 * Math.sin(rad(angle - 90)),
  };

  return (
    <div className="space-y-5">
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Air Quality Index</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Dial */}
        <div className="shrink-0 pb-8 min-h-48 flex items-start justify-center">
          <svg viewBox="0 0 180 130" className="w-44 h-36">
            <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="#F1F5F9" strokeWidth="14" strokeLinecap="round" />
            {[
              { pct: 0.167, color: "#10B981" }, { pct: 0.167, color: "#F59E0B" },
              { pct: 0.167, color: "#f97316" }, { pct: 0.167, color: "#EF4444" },
              { pct: 0.167, color: "#7c3aed" }, { pct: 0.165, color: "#831843" },
            ].reduce((acc, seg, i) => {
              const prev = acc.offset;
              const dashLen = seg.pct * Math.PI * 70;
              const total = Math.PI * 70;
              acc.els.push(
                <path key={i} d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke={seg.color} strokeWidth="14" strokeLinecap="butt"
                  strokeDasharray={`${dashLen} ${total}`} strokeDashoffset={-prev} />
              );
              acc.offset += dashLen;
              return acc;
            }, { offset: 0, els: [] }).els}
            <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="5" fill="#0F172A" />
            <text x={cx} y={cy + 22} textAnchor="middle" fontWeight="800" fontSize="56" fill={meta.color} letterSpacing="-0.04em">{aqi_value}</text>
          </svg>
        </div>

        {/* Label */}
        <div>
          <div style={{
            display: "inline-block", padding: "4px 12px", borderRadius: 8,
            fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            color: meta.color, marginBottom: 8,
          }}>
            {meta.label}
          </div>
          <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.6 }}>{meta.msg}</p>
        </div>
      </div>

      {/* Pollutants */}
      <div className="space-y-3">
        <h4 style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}>Pollutants</h4>
        <PollutantBar name="PM2.5" value={pollutants.pm25 ?? 12} max={55} unit="ug/m3" color="#0EA5E9" />
        <PollutantBar name="Ozone (O3)" value={pollutants.ozone ?? 45} max={105} unit="ppb" color="#F59E0B" />
        <PollutantBar name="NO2" value={pollutants.no2 ?? 25} max={100} unit="ppb" color="#8B5CF6" />
        <PollutantBar name="CO" value={pollutants.co ?? 1.2} max={9} unit="ppm" color="#10B981" />
      </div>

      {/* 30-day trend */}
      {trend.length > 0 && (
        <div>
          <h4 style={{ fontWeight: 600, color: "#0F172A", fontSize: 13, marginBottom: 8 }}>30-Day AQI Trend</h4>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94A3B8" }} interval={6} stroke="#E2E8F0" />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} domain={[0, 200]} stroke="#E2E8F0" />
                <Tooltip
                  formatter={(v) => [v, "AQI"]}
                  contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, color: "#0F172A", fontSize: 12 }}
                  itemStyle={{ color: "#0F172A" }}
                  labelStyle={{ color: "#94A3B8" }}
                />
                <Line type="monotone" dataKey="aqi" stroke={meta.color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
