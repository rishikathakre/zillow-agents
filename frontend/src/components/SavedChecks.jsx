import { useMemo, useState } from "react";
import PDFReport from "./PDFReport";

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

export default function SavedChecks({ savedChecks, onDelete }) {
  const [search, setSearch] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const filtered = useMemo(() => {
    return savedChecks.filter((record) => {
      const matchesSearch = record.address.toLowerCase().includes(search.toLowerCase());
      const matchesZip = !zipFilter || record.zip_code === zipFilter;
      const matchesRecommendation = !recommendationFilter || record.recommendation === recommendationFilter;
      return matchesSearch && matchesZip && matchesRecommendation;
    });
  }, [savedChecks, search, zipFilter, recommendationFilter]);

  const zipOptions = [...new Set(savedChecks.map((item) => item.zip_code))];

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search address"
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
          />
          <select value={zipFilter} onChange={(event) => setZipFilter(event.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3">
            <option value="">All ZIPs</option>
            {zipOptions.map((zip) => (
              <option key={zip} value={zip}>
                {zip}
              </option>
            ))}
          </select>
          <select
            value={recommendationFilter}
            onChange={(event) => setRecommendationFilter(event.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          >
            <option value="">All recommendations</option>
            <option value="BUY">BUY</option>
            <option value="HOLD">HOLD</option>
            <option value="PASS">PASS</option>
          </select>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">{filtered.length} saved checks</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">ZIP</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Overall Score</th>
              <th className="px-4 py-3">Recommendation</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id} className="border-t border-slate-100">
                <td className="px-4 py-4 font-semibold text-slate-900">{record.address}</td>
                <td className="px-4 py-4">{record.zip_code}</td>
                <td className="px-4 py-4">{formatDate(record.date)}</td>
                <td className="px-4 py-4">{record.overall_score.toFixed(1)}</td>
                <td className="px-4 py-4">{record.recommendation}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedRecord(record)} className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                      View full report
                    </button>
                    <PDFReport record={record} />
                    <button type="button" onClick={() => onDelete(record.id)} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRecord && (
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Full Report</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedRecord.address}</h3>
            </div>
            <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Close
            </button>
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedRecord.report_text}</div>
        </div>
      )}
    </div>
  );
}
