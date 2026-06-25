import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client";

function useScoreArc(score) {
  const r = 52, c = 2 * Math.PI * r, dash = (score / 100) * c;
  const color = score >= 75 ? "#10B981" : score >= 55 ? "#F59E0B" : "#EF4444";
  const verdict = score >= 75
    ? { t: "BUY",  bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0", sub: "#059669" }
    : score >= 55
    ? { t: "HOLD", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A", sub: "#D97706" }
    : { t: "PASS", bg: "#FEF2F2", color: "#991B1B", border: "#FCA5A5", sub: "#EF4444" };
  return { color, dash, c, r, verdict };
}

export default function InvestmentSidebar({ listing, analysis }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  if (!listing) return null;
  const score = analysis?.weighted_total ?? listing.propiq_score ?? 50;
  const { color, dash, c, r, verdict } = useScoreArc(score);

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
          pm25_display: aq.pm25 ? `${aq.pm25} ug/m3` : "N/A",
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

  const metrics = analysis?.scores ?? listing?.scores ?? {};
  const rentYield = analysis?.rental_yield ?? (listing.monthly_rent && listing.price ? ((listing.monthly_rent * 12) / listing.price * 100).toFixed(1) : null);

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, textAlign: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <svg viewBox="0 0 120 120" className="w-28 h-28 mx-auto">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#F1F5F9" strokeWidth="12" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dasharray 0.6s ease" }} />
          <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{score}</text>
          <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#94A3B8">PropIQ Score</text>
        </svg>

        {/* Recommendation box */}
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 12,
          background: verdict.bg, border: `1px solid ${verdict.border}`,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: verdict.color, letterSpacing: "-0.02em" }}>{verdict.t}</div>
          {analysis?.summary && (
            <p style={{ fontSize: 11, color: verdict.sub, marginTop: 4, lineHeight: 1.5 }}>{analysis.summary}</p>
          )}
        </div>
      </div>

      {/* Price summary */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <h4 style={{ fontWeight: 700, color: "#0F172A", fontSize: 13, marginBottom: 12 }}>Price Summary</h4>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em" }}>${listing.price?.toLocaleString()}</div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>${listing.sqft ? Math.round(listing.price / listing.sqft) : "--"}/sqft</div>

        <div style={{ borderTop: "1px solid #F1F5F9", marginTop: 16, paddingTop: 16 }} className="space-y-2.5">
          {listing.monthly_rent && (
            <div className="flex justify-between" style={{ fontSize: 12 }}>
              <span style={{ color: "#94A3B8" }}>Est. Monthly Rent</span>
              <span style={{ fontWeight: 600, color: "#0F172A" }}>${listing.monthly_rent?.toLocaleString()}</span>
            </div>
          )}
          {rentYield && (
            <div className="flex justify-between" style={{ fontSize: 12 }}>
              <span style={{ color: "#94A3B8" }}>Rental Yield</span>
              <span style={{ fontWeight: 600, color: "#10B981" }}>{rentYield}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      {Object.keys(metrics).length > 0 && (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-3">
            <h4 style={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>Score Breakdown</h4>
            {!analysis && (
              <span className="flex items-center gap-1.5" style={{
                fontSize: 11, color: "#0369A1", background: "#F0F9FF",
                padding: "2px 8px", borderRadius: 20, border: "1px solid #BAE6FD",
              }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: "#0EA5E9" }} />
                Analyzing...
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {Object.entries(metrics).map(([k, v]) => {
              const barColor = v >= 70 ? "#10B981" : v >= 40 ? "#F59E0B" : "#EF4444";
              return (
                <div key={k}>
                  <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                    <span className="capitalize" style={{ color: "#475569" }}>{k.replace(/_/g, " ")}</span>
                    <span className={!analysis ? "animate-pulse" : ""} style={{ fontWeight: 600, color: "#0F172A" }}>{v === null ? "N/A" : `${v}/100`}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: v ? `${v}%` : "0%", background: analysis ? barColor : "#0EA5E9" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current conditions */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <h4 style={{ fontWeight: 700, color: "#0F172A", fontSize: 13, marginBottom: 12 }}>Current Conditions</h4>
        <div className="flex gap-2">
          {[
            { label: "AQI", value: listing.aqi_value ? `${listing.aqi_value}` : "--" },
            { label: "Pollen", value: listing.pollen_level ? `${listing.pollen_level}` : "--" },
            { label: "Climate", value: listing.climate_score ? `${listing.climate_score}` : "--" },
          ].map(r => (
            <div key={r.label} style={{
              background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8,
              padding: "8px 12px", fontSize: 11, color: "#0369A1", fontWeight: 500, flex: 1, textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2 }}>{r.label}</div>
              {r.value}
            </div>
          ))}
        </div>
      </div>

      {/* PDF download */}
      {analysis && (
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 transition-all duration-150"
          style={{
            background: "#0EA5E9", color: "white", border: "none", borderRadius: 9,
            padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
            opacity: downloading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.background = "#0284C7"; }}
          onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {downloading ? "Generating..." : "Download Analysis Report"}
        </button>
      )}
    </div>
  );
}
