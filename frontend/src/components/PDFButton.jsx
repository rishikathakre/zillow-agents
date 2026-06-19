import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";

export default function PDFButton({ analysis, propertyDetails }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (!analysis) return;
    setLoading(true);
    try {
      const details = {
        address: analysis.address || propertyDetails?.address || "",
        zip_code: analysis.zip_code,
        property_type: propertyDetails?.property_type || "N/A",
        bedrooms: propertyDetails?.bedrooms || "N/A",
        bathrooms: propertyDetails?.bathrooms || "N/A",
        sqft: propertyDetails?.sqft || "N/A",
        year_built: propertyDetails?.year_built || "N/A",
        generated_at: analysis.generated_at,
        asking_price_display: propertyDetails?.asking_price
          ? `$${Number(propertyDetails.asking_price).toLocaleString()}`
          : "N/A",
        estimated_rent_display: propertyDetails?.estimated_rent
          ? `$${Number(propertyDetails.estimated_rent).toLocaleString()}/mo`
          : "N/A",
        str_yield_display: analysis.metrics?.str_yield_pct ? `${analysis.metrics.str_yield_pct}%` : "N/A",
        ltr_yield_display: analysis.metrics?.ltr_yield_pct ? `${analysis.metrics.ltr_yield_pct}%` : "N/A",
        estimated_return_display: analysis.metrics?.estimated_annual_return_pct
          ? `${analysis.metrics.estimated_annual_return_pct}%`
          : "N/A",
        aqi_display: analysis.air_quality_detail
          ? `${analysis.air_quality_detail.aqi_value} (${analysis.air_quality_detail.category})`
          : "N/A",
        pm25_display: analysis.air_quality_detail?.pm25
          ? `${analysis.air_quality_detail.pm25} μg/m³`
          : "N/A",
        flood_zone: analysis.climate_details?.flood_zone || "N/A",
        wildfire_display: analysis.climate_details?.wildfire_risk_score
          ? `${analysis.climate_details.wildfire_risk_score}/100`
          : "N/A",
        tree_pollen: analysis.pollen_calendar?.tree_level || "N/A",
        grass_pollen: analysis.pollen_calendar?.grass_level || "N/A",
        heat_days: analysis.climate_details?.heat_days_per_year
          ? `${analysis.climate_details.heat_days_per_year} days/year`
          : "N/A",
        insurance_note: analysis.climate_details?.insurance_note || "N/A",
        school_rating: analysis.neighborhood_details?.school_rating || "N/A",
        crime_index: analysis.neighborhood_details?.crime_index || "N/A",
        walk_score: analysis.neighborhood_details?.walk_score || "N/A",
        transit_score: analysis.neighborhood_details?.transit_score || "N/A",
        employment_growth: analysis.market_intelligence?.employment_growth_pct
          ? `${analysis.market_intelligence.employment_growth_pct}%`
          : "N/A",
        median_income: analysis.neighborhood_details?.median_income
          ? `$${Number(analysis.neighborhood_details.median_income).toLocaleString()}`
          : "N/A",
        trajectory: analysis.neighborhood_details?.trajectory || "N/A",
        population: analysis.neighborhood_details?.population
          ? Number(analysis.neighborhood_details.population).toLocaleString()
          : "N/A",
      };

      const payload = {
        property_details: details,
        scores: { score_rows: analysis.score_rows || [] },
        report_text: analysis.report_text || "",
        recommendation: analysis.recommendation || "N/A",
        weighted_total: analysis.weighted_total || 0,
        user_name: user?.name || "PropIQ User",
      };

      const response = await api.post("/pdf", payload, { responseType: "blob" });
      const url = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `PropIQ-${analysis.zip_code}-Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading || !analysis}
      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition"
    >
      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        <>📄 Download PDF Report</>
      )}
    </button>
  );
}
