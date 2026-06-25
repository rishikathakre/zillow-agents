import { useEffect, useState } from "react";
import api from "../api/client.js";
import PDFButton from "./PDFButton.jsx";

const REC_STYLES = {
  BUY:  { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  HOLD: { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  PASS: { bg: "#FEF2F2", color: "#991B1B", border: "#FCA5A5" },
};

export default function MyAnalyses() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  async function loadAnalyses() {
    setLoading(true);
    try {
      const { data } = await api.get("/analyses");
      setAnalyses(data);
    } catch {
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this analysis?")) return;
    setDeleting(id);
    try {
      await api.delete(`/analyses/${id}`);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = analyses
    .filter((a) => {
      const q = search.toLowerCase();
      return (
        (a.address || "").toLowerCase().includes(q) ||
        (a.zip_code || "").includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date) - new Date(a.date);
      if (sortBy === "score") return b.overall_score - a.overall_score;
      if (sortBy === "rec") return (a.recommendation || "").localeCompare(b.recommendation || "");
      return 0;
    });

  const inputFocus = (e) => { e.target.style.borderColor = "#0EA5E9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.1)"; };
  const inputBlur = (e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; };

  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em" }}>My Analyses</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>All your saved property analyses.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address or ZIP..."
          className="flex-1 min-w-48 rounded-xl px-4 py-2.5 text-sm outline-none transition"
          style={{ background: "white", border: "1px solid #E2E8F0", color: "#0F172A" }}
          onFocus={inputFocus} onBlur={inputBlur}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm outline-none transition"
          style={{ background: "white", border: "1px solid #E2E8F0", color: "#0F172A" }}
        >
          <option value="date">Sort: Newest</option>
          <option value="score">Sort: Score</option>
          <option value="rec">Sort: Recommendation</option>
        </select>
        <button onClick={loadAnalyses}
          style={{
            background: "#0EA5E9", color: "white", fontSize: 13, fontWeight: 600,
            padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer",
            transition: "background 150ms",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#0284C7"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center" style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 48 }}>
          <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-3" style={{ border: "4px solid #E2E8F0", borderTopColor: "#0EA5E9" }} />
          <p style={{ fontSize: 13, color: "#475569" }}>Loading analyses...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center" style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 48 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
            {search ? "No results found" : "No analyses yet"}
          </h3>
          <p style={{ fontSize: 13, color: "#475569" }}>
            {search ? "Try a different search term." : "Search a property to get started."}
          </p>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  {["Address", "ZIP", "Date", "Score", "Recommendation", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#94A3B8", background: "#F8FAFC" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const rs = REC_STYLES[a.recommendation] || { bg: "#F1F5F9", color: "#94A3B8", border: "#E2E8F0" };
                  return (
                    <tr key={a.id} className="transition" style={{ borderBottom: "1px solid #E2E8F0" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-4 py-3 text-sm font-medium max-w-xs truncate" style={{ color: "#0F172A" }}>
                        {a.address || `ZIP ${a.zip_code}`}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: "#475569" }}>{a.zip_code}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#475569" }}>
                        {a.date ? new Date(a.date).toLocaleDateString() : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{a.overall_score?.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
                          background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`,
                        }}>
                          {a.recommendation}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PDFButton analysis={a.data} propertyDetails={a.data?.metrics || {}} />
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deleting === a.id}
                            style={{
                              fontSize: 12, fontWeight: 600, color: "#EF4444",
                              background: "none", border: "none", cursor: "pointer",
                              opacity: deleting === a.id ? 0.5 : 1,
                            }}
                          >
                            {deleting === a.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3" style={{ fontSize: 12, color: "#94A3B8", borderTop: "1px solid #E2E8F0" }}>
            {filtered.length} {filtered.length === 1 ? "analysis" : "analyses"} shown
          </div>
        </div>
      )}
    </div>
  );
}
