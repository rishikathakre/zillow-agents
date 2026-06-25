function gaugeColor(score) {
  if (score >= 70) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function recLabel(score) {
  if (score >= 70) return "BUY";
  if (score >= 40) return "HOLD";
  return "PASS";
}

function recStyle(score) {
  if (score >= 70) return { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" };
  if (score >= 40) return { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" };
  return { bg: "#FEF2F2", color: "#991B1B", border: "#FCA5A5" };
}

export default function ScoreGauge({ score, size = 180 }) {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = gaugeColor(score);
  const rec = recLabel(score);
  const rs = recStyle(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={size * 0.08} />
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
          x={cx} y={cx - 8}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.21} fontWeight="900" fill={color}
          fontFamily="Inter, sans-serif"
        >
          {Math.round(score)}
        </text>
        <text
          x={cx} y={cy + size * 0.13}
          textAnchor="middle"
          fontSize={size * 0.085} fill="#94A3B8"
          fontFamily="Inter, sans-serif" fontWeight="600"
        >
          / 100
        </text>
      </svg>
      <span
        className="mt-1 rounded-lg px-5 py-1.5 text-sm font-bold tracking-wide"
        style={{ backgroundColor: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}
      >
        {rec}
      </span>
    </div>
  );
}
