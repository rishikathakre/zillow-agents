import { useEffect, useState } from "react";
import api from "../api/client.js";

const REC_STYLES = {
  BUY:  { color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
  HOLD: { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
  PASS: { color: "#EF4444", bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
};

function ScoreDot({ score }) {
  const color = score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";
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

const inputFocus = (e) => { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; };
const inputBlur = (e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; };

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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em" }}>Market Map</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Compare analyzed ZIP codes side by side.</p>
      </div>

      {/* Add zip + filter */}
      <div className="flex flex-wrap gap-3">
        <input
          value={zipInput}
          onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
          onKeyDown={(e) => e.key === "Enter" && addZip()}
          placeholder="Add ZIP code..."
          className="rounded-xl px-4 py-2.5 text-sm font-mono outline-none transition w-40"
          style={{ background: "white", border: "1px solid #E2E8F0", color: "#0F172A" }}
          onFocus={inputFocus} onBlur={inputBlur}
        />
        <button
          onClick={addZip}
          disabled={adding}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all duration-150 flex items-center gap-2"
          style={{ background: "#0EA5E9", color: "white", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { if (!adding) e.currentTarget.style.background = "#0284C7"; }}
          onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
        >
          {adding && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {adding ? "Analyzing..." : "Add ZIP"}
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm outline-none transition"
          style={{ background: "white", border: "1px solid #E2E8F0", color: "#0F172A" }}
        >
          <option value="score">Sort: Score</option>
          <option value="rec">Sort: Recommendation</option>
          <option value="zip">Sort: ZIP Code</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-medium" style={{ color: "#94A3B8" }}>
        <span>Score layer:</span>
        {[[">=70 BUY", "#10B981"], ["40-69 HOLD", "#F59E0B"], ["<40 PASS", "#EF4444"]].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="text-center" style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 48 }}>
          <div className="w-8 h-8 rounded-full animate-spin mx-auto" style={{ border: "4px solid #E2E8F0", borderTopColor: "#0EA5E9" }} />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center" style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 48 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>No analyzed ZIPs yet</h3>
          <p style={{ fontSize: 13, color: "#475569" }}>Add a ZIP code above or analyze a property first.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-5">
          {/* Bubble grid */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 20 }}>Score Bubbles</h3>
            <div className="flex flex-wrap gap-4 items-end">
              {sorted.map((a) => {
                const score = a.overall_score || 0;
                const rc = REC_STYLES[a.recommendation] || REC_STYLES.HOLD;
                const isActive = selected?.zip_code === a.zip_code;
                return (
                  <button
                    key={a.zip_code}
                    onClick={() => setSelected(isActive ? null : a)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition"
                    style={{
                      border: `2px solid ${isActive ? rc.border : "transparent"}`,
                      background: isActive ? rc.bg : "transparent",
                    }}
                  >
                    <ScoreDot score={score} />
                    <span className="text-xs font-mono font-bold" style={{ color: "#475569" }}>{a.zip_code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
            {selected ? (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>ZIP Code</p>
                    <p className="font-mono" style={{ fontSize: 24, fontWeight: 900, color: "#0F172A" }}>{selected.zip_code}</p>
                  </div>
                  {(() => {
                    const rc = REC_STYLES[selected.recommendation] || REC_STYLES.HOLD;
                    return (
                      <span className="text-sm font-bold px-3 py-1 rounded-lg"
                        style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                        {selected.recommendation}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-4xl font-black text-center py-4" style={{
                  color: (selected.overall_score >= 70 ? "#10B981" : selected.overall_score >= 40 ? "#F59E0B" : "#EF4444"),
                }}>
                  {selected.overall_score?.toFixed(1)}
                  <span style={{ fontSize: 18, color: "#94A3B8", fontWeight: 400 }}>/100</span>
                </div>
                {selected.data?.scores && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(selected.data.scores).slice(0, 5).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="truncate flex-1" style={{ fontSize: 12, color: "#475569" }}>
                          {k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{Number(v).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setSelected(null)}
                  className="mt-4 w-full text-xs transition"
                  style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <p style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Click a bubble to see ZIP details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ranked list */}
      {sorted.length > 0 && (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Ranked ZIPs</h3>
          </div>
          <div>
            {sorted.map((a, idx) => {
              const rc = REC_STYLES[a.recommendation] || REC_STYLES.HOLD;
              return (
                <div key={a.zip_code} className="flex items-center gap-4 px-5 py-3 transition"
                  style={{ borderBottom: idx < sorted.length - 1 ? "1px solid #E2E8F0" : "none" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span className="w-5 text-center" style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8" }}>{idx + 1}</span>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rc.color }} />
                  <span className="font-mono text-sm font-bold" style={{ color: "#0F172A" }}>{a.zip_code}</span>
                  <span className="text-sm flex-1 truncate" style={{ color: "#475569" }}>{a.address}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{a.recommendation}</span>
                  <span className="w-12 text-right" style={{ fontSize: 13, fontWeight: 900, color: "#0F172A" }}>{(a.overall_score || 0).toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
