function Metric({ label, value, sub }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function InvestmentTab({ result, form }) {
  if (!result) return null;

  const m = result.metrics || {};
  const str = m.str_yield_pct ?? 0;
  const ltr = m.ltr_yield_pct ?? 0;
  const strDiff = (str - ltr).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric
          label="Gross Rental Yield"
          value={`${ltr.toFixed(1)}%`}
          sub="Long-term rental"
        />
        <Metric
          label="STR vs LTR"
          value={`${strDiff > 0 ? "+" : ""}${strDiff}%`}
          sub="Airbnb premium"
        />
        <Metric
          label="Est. Annual Return"
          value={`${m.estimated_annual_return_pct ?? "N/A"}%`}
          sub="Gross estimate"
        />
        <Metric
          label="AQI Category"
          value={m.aqi_health_category || "N/A"}
          sub="Environmental health"
        />
      </div>

      {/* Score breakdown */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Score Breakdown by Agent</h3>
        <div className="space-y-2">
          {(result.score_rows || []).map((row) => {
            const s = Number(row.score);
            const color = s >= 70 ? "bg-green-500" : s >= 40 ? "bg-amber-500" : "bg-red-500";
            const tcolor = s >= 70 ? "text-green-700" : s >= 40 ? "text-amber-700" : "text-red-700";
            return (
              <div key={row.key} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 w-44 flex-shrink-0 truncate">{row.label}</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-2.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.max(2, s)}%` }} />
                </div>
                <span className={`text-xs font-bold w-10 text-right flex-shrink-0 ${tcolor}`}>{s.toFixed(0)}</span>
                <span className="text-xs text-slate-400 w-10 text-right flex-shrink-0">{(row.weight * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Report */}
      {result.report_text && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">AI Investment Report</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{result.report_text}</p>
        </div>
      )}

      {/* STR vs LTR comparison */}
      {(str > 0 || ltr > 0) && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">STR vs LTR Comparison</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-blue-600 mb-1">Long-Term Rental</p>
              <p className="text-2xl font-black text-blue-700">{ltr.toFixed(1)}%</p>
              <p className="text-xs text-blue-500 mt-1">Gross yield</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-green-600 mb-1">Short-Term (Airbnb)</p>
              <p className="text-2xl font-black text-green-700">{str.toFixed(1)}%</p>
              <p className="text-xs text-green-500 mt-1">Estimated STR yield</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
