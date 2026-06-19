import { useEffect, useState } from "react";
import api from "../api/client.js";
import PDFButton from "./PDFButton.jsx";

const REC_STYLES = {
  BUY: "bg-green-100 text-green-700",
  HOLD: "bg-amber-100 text-amber-700",
  PASS: "bg-red-100 text-red-700",
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Analyses</h1>
        <p className="text-sm text-slate-500 mt-1">All your saved property analyses.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address or ZIP..."
          className="flex-1 min-w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition"
        >
          <option value="date">Sort: Newest</option>
          <option value="score">Sort: Score</option>
          <option value="rec">Sort: Recommendation</option>
        </select>
        <button
          onClick={loadAnalyses}
          className="bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading analyses...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {search ? "No results found" : "No analyses yet"}
          </h3>
          <p className="text-sm text-slate-500">
            {search ? "Try a different search term." : "Search a property to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Address", "ZIP", "Date", "Score", "Recommendation", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => (
                  <tr
                    key={a.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx % 2 === 0 ? "" : "bg-slate-50/50"}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-xs truncate">
                      {a.address || `ZIP ${a.zip_code}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{a.zip_code}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                      {a.date ? new Date(a.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-900">{a.overall_score?.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${REC_STYLES[a.recommendation] || "bg-slate-100 text-slate-700"}`}>
                        {a.recommendation}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PDFButton analysis={a.data} propertyDetails={a.data?.metrics || {}} />
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deleting === a.id}
                          className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 whitespace-nowrap transition"
                        >
                          {deleting === a.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100">
            {filtered.length} {filtered.length === 1 ? "analysis" : "analyses"} shown
          </div>
        </div>
      )}
    </div>
  );
}
