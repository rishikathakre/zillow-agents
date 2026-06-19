function gaugeColor(score) {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function recLabel(score) {
  if (score >= 70) return "BUY";
  if (score >= 40) return "HOLD";
  return "PASS";
}

export default function ScoreGauge({ score, size = 180 }) {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = gaugeColor(score);
  const rec = recLabel(score);

  const recColors = { BUY: "#16a34a", HOLD: "#d97706", PASS: "#dc2626" };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={size * 0.08} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
        <text
          x={cx} y={cy - 8}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.21} fontWeight="900" fill={color}
          fontFamily="Inter, sans-serif"
        >
          {Math.round(score)}
        </text>
        <text
          x={cx} y={cy + size * 0.13}
          textAnchor="middle"
          fontSize={size * 0.085} fill="#94a3b8"
          fontFamily="Inter, sans-serif" fontWeight="600"
        >
          / 100
        </text>
      </svg>
      <span
        className="mt-1 rounded-full px-5 py-1.5 text-sm font-bold text-white tracking-wide"
        style={{ backgroundColor: recColors[rec] }}
      >
        {rec}
      </span>
    </div>
  );
}
