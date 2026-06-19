import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function aqiMeta(v) {
  if (v <= 50) return { label: "Good", color: "#22c55e", bg: "bg-green-100", text: "text-green-800", msg: "Air quality is satisfactory, and air pollution poses little or no risk." };
  if (v <= 100) return { label: "Moderate", color: "#eab308", bg: "bg-yellow-100", text: "text-yellow-800", msg: "Air quality is acceptable. Unusually sensitive people should consider limiting prolonged outdoor exertion." };
  if (v <= 150) return { label: "Unhealthy for Sensitive", color: "#f97316", bg: "bg-orange-100", text: "text-orange-800", msg: "Members of sensitive groups may experience health effects. General public is not likely to be affected." };
  if (v <= 200) return { label: "Unhealthy", color: "#ef4444", bg: "bg-red-100", text: "text-red-800", msg: "Everyone may begin to experience health effects. Sensitive groups may experience more serious effects." };
  return { label: "Very Unhealthy", color: "#7c3aed", bg: "bg-purple-100", text: "text-purple-800", msg: "Health alert: everyone may experience more serious health effects." };
}

function PollutantBar({ name, value, max, unit, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 font-medium">{name}</span>
        <span className="text-gray-800">{value} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
      </div>
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
      <h3 className="text-lg font-bold text-gray-900">Air Quality Index</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Dial */}
        <div className="shrink-0 pb-8 min-h-48 flex items-start justify-center">
          <svg viewBox="0 0 180 130" className="w-44 h-36">
            <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
            {[
              { pct: 0.167, color: "#22c55e" }, { pct: 0.167, color: "#eab308" },
              { pct: 0.167, color: "#f97316" }, { pct: 0.167, color: "#ef4444" },
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
            <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="5" fill="#1f2937" />
            <text x={cx} y={cy + 22} textAnchor="middle" fontWeight="bold" fontSize="22" fill="#1f2937">{aqi_value}</text>
            <text x={cx} y={cy + 38} textAnchor="middle" fontSize="11" fill={meta.color} fontWeight="600">{meta.label}</text>
          </svg>
        </div>

        {/* Label */}
        <div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${meta.bg} ${meta.text} mb-2`}>{meta.label}</div>
          <p className="text-gray-600 text-sm leading-relaxed">{meta.msg}</p>
        </div>
      </div>

      {/* Pollutants */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800">Pollutants</h4>
        <PollutantBar name="PM2.5" value={pollutants.pm25 ?? 12} max={55} unit="µg/m³" color="#f97316" />
        <PollutantBar name="Ozone (O₃)" value={pollutants.ozone ?? 45} max={105} unit="ppb" color="#eab308" />
        <PollutantBar name="NO₂" value={pollutants.no2 ?? 25} max={100} unit="ppb" color="#6366f1" />
        <PollutantBar name="CO" value={pollutants.co ?? 1.2} max={9} unit="ppm" color="#14b8a6" />
      </div>

      {/* 30-day trend */}
      {trend.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">30-Day AQI Trend</h4>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 200]} />
                <Tooltip formatter={(v) => [v, "AQI"]} />
                <Line type="monotone" dataKey="aqi" stroke={meta.color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
