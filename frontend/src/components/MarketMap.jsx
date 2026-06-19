import { useEffect, useState } from "react";
import api from "../api/client.js";

const REC_COLORS = {
  BUY: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", dot: "bg-green-500" },
  HOLD: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", dot: "bg-amber-500" },
  PASS: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", dot: "bg-red-500" },
};

function ScoreDot({ score }) {
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";
  const r = 16 + (score / 100) * 18;
  return (
    <svg width={r * 2 + 4} height={r * 2 + 4} viewBox={`0 0 ${r * 2 + 4} ${r * 2 + 4}`}>
      <circle cx={r + 2} cy={r + 2} r={r} fill={color} opacity={0.15} />
      <circle cx={r + 2} cy={r + 2} r={r * 0.55} fill={color} />
      <text x={r + 2} y={r + 2} textAnchor="middle" dominantBaseline="middle" fill="white"
        fontSize={r * 0.55} fontWeight="700" fontFamily="Inter, sans-serif">
        {Math.round(score)}
      </text>
    </svg>
  );
}

export default function MarketMap() {
  const [analyses, setAnalyses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("score");
  const [loading, setLoading] = useState(true);
  const [zipInput, setZipInput] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get("/analyses")
      .then(({ data }) => setAnalyses(data))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, []);

  async function addZip() {
    const zip = zipInput.replace(/\D/g, "").slice(0, 5);
    if (zip.length !== 5) return;
    setAdding(true);
    try {
      const { data } = await api.post("/analyze", { zip_code: zip });
      setAnalyses((prev) => {
        const exists = prev.find((a) => a.zip_code === zip);
        if (exists) return prev;
        return [{ id: data.zip_code, zip_code: zip, address: `ZIP ${zip}`, overall_score: data.weighted_total, recommendation: data.recommendation, data }, ...prev];
      });
      setZipInput("");
    } catch {
      alert("Failed to analyze ZIP.");
    } finally {
      setAdding(false);
    }
  }

  const unique = Object.values(
    analyses.reduce((acc, a) => {
      if (!acc[a.zip_code]) acc[a.zip_code] = a;
      return acc;
    }, {})
  );

  const sorted = [...unique].sort((a, b) => {
    if (filter === "score") return (b.overall_score || 0) - (a.overall_score || 0);
    if (filter === "rec") return (a.recommendation || "").localeCompare(b.recommendation || "");
    return a.zip_code.localeCompare(b.zip_code);
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Market Map</h1>
        <p className="text-sm text-slate-500 mt-1">Compare analyzed ZIP codes side by side.</p>
      </div>

      {/* Add zip + filter */}
      <div className="flex flex-wrap gap-3">
        <input
          value={zipInput}
          onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
          onKeyDown={(e) => e.key === "Enter" && addZip()}
          placeholder="Add ZIP code..."
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition w-40"
        />
        <button
          onClick={addZip}
          disabled={adding}
          className="bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-60 transition flex items-center gap-2"
        >
          {adding && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {adding ? "Analyzing..." : "Add ZIP"}
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition"
        >
          <option value="score">Sort: Score</option>
          <option value="rec">Sort: Recommendation</option>
          <option value="zip">Sort: ZIP Code</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
        <span>Score layer:</span>
        {[["≥70 BUY", "bg-green-500"], ["40-69 HOLD", "bg-amber-500"], ["<40 PASS", "bg-red-500"]].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No analyzed ZIPs yet</h3>
          <p className="text-sm text-slate-500">Add a ZIP code above or analyze a property first.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-5">
          {/* Visual "map" — bubble grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Score Bubbles</h3>
            <div className="flex flex-wrap gap-4 items-end">
              {sorted.map((a) => {
                const score = a.overall_score || 0;
                const rc = REC_COLORS[a.recommendation] || REC_COLORS.HOLD;
                return (
                  <button
                    key={a.zip_code}
                    onClick={() => setSelected(selected?.zip_code === a.zip_code ? null : a)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition border-2 ${
                      selected?.zip_code === a.zip_code
                        ? `${rc.border} ${rc.bg}`
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <ScoreDot score={score} />
                    <span className="text-xs font-mono font-bold text-slate-700">{a.zip_code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            {selected ? (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">ZIP Code</p>
                    <p className="text-2xl font-black text-slate-900 font-mono">{selected.zip_code}</p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${REC_COLORS[selected.recommendation]?.bg || ""} ${REC_COLORS[selected.recommendation]?.text || ""}`}>
                    {selected.recommendation}
                  </span>
                </div>
                <div className="text-4xl font-black text-center py-4" style={{
                  color: (selected.overall_score >= 70 ? "#16a34a" : selected.overall_score >= 40 ? "#d97706" : "#dc2626"),
                }}>
                  {selected.overall_score?.toFixed(1)}
                  <span className="text-lg text-slate-400 font-normal">/100</span>
                </div>
                {selected.data?.scores && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(selected.data.scores).slice(0, 5).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 truncate flex-1">
                          {k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{Number(v).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="mt-4 w-full text-xs text-slate-400 hover:text-slate-700 transition"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <span className="text-3xl mb-3">👆</span>
                <p className="text-sm font-medium text-slate-500">Click a bubble to see ZIP details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ranked list */}
      {sorted.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Ranked ZIPs</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {sorted.map((a, idx) => {
              const rc = REC_COLORS[a.recommendation] || REC_COLORS.HOLD;
              return (
                <div key={a.zip_code} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                  <span className="text-sm font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rc.dot}`} />
                  <span className="font-mono text-sm font-bold text-slate-900">{a.zip_code}</span>
                  <span className="text-sm text-slate-500 flex-1 truncate">{a.address}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>{a.recommendation}</span>
                  <span className="text-sm font-black text-slate-900 w-12 text-right">{(a.overall_score || 0).toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
