import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client";

function ScoreArc({ score }) {
  const r = 52, c = 2 * Math.PI * r, dash = (score / 100) * c;
  const color = score >= 75 ? "#22c55e" : score >= 55 ? "#eab308" : "#ef4444";
  const verdict = score >= 75 ? { t: "BUY", bg: "bg-green-100", text: "text-green-700" }
    : score >= 55 ? { t: "HOLD", bg: "bg-yellow-100", text: "text-yellow-700" }
    : { t: "PASS", bg: "bg-red-100", text: "text-red-700" };
  return { color, dash, c, r, verdict };
}

export default function InvestmentSidebar({ listing, analysis }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  if (!listing) return null;
  const score = analysis?.weighted_total ?? listing.propiq_score ?? 50;
  const { color, dash, c, r, verdict } = ScoreArc({ score });

  async function downloadPdf() {
    if (!analysis) return;
    setDownloading(true);
    try {
      const nd = analysis.neighborhood_details ?? {};
      const cd = analysis.climate_details ?? {};
      const mi = analysis.market_intelligence ?? {};
      const aq = analysis.air_quality_detail ?? {};
      const pc = analysis.pollen_calendar ?? {};
      const mt = analysis.metrics ?? {};

      const payload = {
        property_details: {
          address: listing.full_address || listing.address || `ZIP ${listing.zip_code}`,
          zip_code: listing.zip_code,
          property_type: listing.property_type || "N/A",
          bedrooms: listing.beds ?? "N/A",
          bathrooms: listing.baths ?? "N/A",
          sqft: listing.sqft ?? "N/A",
          year_built: listing.year_built ?? "N/A",
          generated_at: analysis.generated_at,
          asking_price_display: listing.price ? `$${Number(listing.price).toLocaleString()}` : "N/A",
          estimated_rent_display: listing.monthly_rent ? `$${Number(listing.monthly_rent).toLocaleString()}/mo` : "N/A",
          str_yield_display: mt.str_yield_pct ? `${mt.str_yield_pct}%` : "N/A",
          ltr_yield_display: mt.ltr_yield_pct ? `${mt.ltr_yield_pct}%` : "N/A",
          estimated_return_display: mt.estimated_annual_return_pct ? `${mt.estimated_annual_return_pct}%` : "N/A",
          aqi_display: aq.aqi_value ? `${aq.aqi_value} (${aq.category ?? ""})` : "N/A",
          pm25_display: aq.pm25 ? `${aq.pm25} µg/m³` : "N/A",
          flood_zone: cd.flood_zone ?? "N/A",
          wildfire_display: cd.wildfire_risk_score != null ? `${cd.wildfire_risk_score}/100` : "N/A",
          tree_pollen: pc.tree_level ?? "N/A",
          grass_pollen: pc.grass_level ?? "N/A",
          heat_days: cd.heat_days_per_year != null ? `${cd.heat_days_per_year} days/year` : "N/A",
          insurance_note: cd.insurance_note ?? "N/A",
          school_rating: nd.school_rating ?? "N/A",
          crime_index: nd.crime_index ?? "N/A",
          walk_score: nd.walk_score ?? "N/A",
          transit_score: nd.transit_score ?? "N/A",
          employment_growth: mi.employment_growth_pct != null ? `${mi.employment_growth_pct}%` : "N/A",
          median_income: nd.median_income ? `$${Number(nd.median_income).toLocaleString()}` : "N/A",
          trajectory: nd.trajectory ?? "N/A",
          population: nd.population ? Number(nd.population).toLocaleString() : "N/A",
        },
        scores: { score_rows: analysis.score_rows ?? [] },
        report_text: analysis.report_text ?? "",
        recommendation: analysis.recommendation ?? "N/A",
        weighted_total: analysis.weighted_total ?? 0,
        user_name: user?.name ?? "PropIQ User",
      };

      const res = await api.post("/pdf", payload, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `PropIQ-${listing.zip_code}-Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("PDF generation failed.");
    } finally {
      setDownloading(false);
    }
  }

  const metrics = analysis?.scores ?? {};
  const rentYield = analysis?.rental_yield ?? (listing.monthly_rent && listing.price ? ((listing.monthly_rent * 12) / listing.price * 100).toFixed(1) : null);

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
        <svg viewBox="0 0 120 120" className="w-28 h-28 mx-auto">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
          <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#111827">{score}</text>
          <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#6b7280">PropIQ Score</text>
        </svg>
        <div className={`inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-extrabold tracking-wide ${verdict.bg} ${verdict.text}`}>
          {verdict.t}
        </div>
        {analysis?.summary && (
          <p className="text-gray-500 text-xs mt-3 leading-relaxed text-left">{analysis.summary}</p>
        )}
      </div>

      {/* Price summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h4 className="font-bold text-gray-900">Price Summary</h4>
        <div className="text-3xl font-bold text-gray-900">${listing.price?.toLocaleString()}</div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Price/sqft</span>
            <span className="font-medium">${listing.sqft ? Math.round(listing.price / listing.sqft) : "—"}</span>
          </div>
          {listing.monthly_rent && (
            <div className="flex justify-between text-gray-600">
              <span>Est. Monthly Rent</span>
              <span className="font-medium">${listing.monthly_rent?.toLocaleString()}</span>
            </div>
          )}
          {rentYield && (
            <div className="flex justify-between text-gray-600">
              <span>Rental Yield</span>
              <span className="font-medium text-green-600">{rentYield}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Investment stats */}
      {Object.keys(metrics).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h4 className="font-bold text-gray-900 mb-3">Score Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(metrics).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span>{v === null ? "N/A" : `${v}/100`}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: v ? `${v}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current conditions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2 text-sm">
        <h4 className="font-bold text-gray-900">Current Conditions</h4>
        {[
          { label: "AQI", value: listing.aqi_value ? `${listing.aqi_value} (${listing.aqi_value <= 50 ? "Good" : listing.aqi_value <= 100 ? "Moderate" : "Unhealthy"})` : "—" },
          { label: "Pollen", value: listing.pollen_level ? `${listing.pollen_level} avg` : "—" },
          { label: "Climate Risk", value: listing.climate_score ? `${listing.climate_score}/100` : "—" },
        ].map(r => (
          <div key={r.label} className="flex justify-between text-gray-600">
            <span>{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </div>
        ))}
      </div>

      {/* PDF button */}
      {analysis && (
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {downloading ? "Generating…" : "Download PDF Report"}
        </button>
      )}
    </div>
  );
}
