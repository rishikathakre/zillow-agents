import ScoreGauge from "./ScoreGauge";
import ScoreBars from "./ScoreBars";

const propertyTypes = ["Single Family", "Condo", "Multi-Family", "Townhouse"];
const bedroomOptions = [1, 2, 3, 4, 5, 6];
const bathroomOptions = [1, 1.5, 2, 2.5, 3, 4, 5];
const sqftOptions = [900, 1200, 1500, 1800, 2200, 2800, 3500];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function badgeColor(label) {
  if (label === "BUY") return "bg-emerald-600";
  if (label === "HOLD") return "bg-amber-500";
  return "bg-red-600";
}

export default function PropertyCheck({
  propertyDraft,
  setPropertyDraft,
  activeZip,
  loading,
  onRunAnalysis,
  analysisResult,
  currentPhotos,
  pdfButton,
}) {
  function updateField(key, value) {
    setPropertyDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Property Check</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Run a single-property investment analysis</h2>
            <p className="mt-2 text-sm text-slate-600">
              This calls the FastAPI backend, which runs the LangGraph ZIP analysis and returns weighted scores, metrics, and the report.
            </p>
          </div>
          {currentPhotos.length > 0 && (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">{currentPhotos.length} listing photos attached</div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Property address</span>
            <input
              value={propertyDraft.address}
              onChange={(event) => updateField("address", event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">ZIP code</span>
            <input
              value={propertyDraft.zip_code || activeZip}
              onChange={(event) => updateField("zip_code", event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Asking price</span>
            <input
              type="number"
              value={propertyDraft.asking_price}
              onChange={(event) => updateField("asking_price", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Estimated market value</span>
            <input
              type="number"
              value={propertyDraft.estimated_value}
              onChange={(event) => updateField("estimated_value", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Estimated monthly rent</span>
            <input
              type="number"
              value={propertyDraft.estimated_rent}
              onChange={(event) => updateField("estimated_rent", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Bedrooms</span>
            <select
              value={propertyDraft.bedrooms}
              onChange={(event) => updateField("bedrooms", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            >
              {bedroomOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Bathrooms</span>
            <select
              value={propertyDraft.bathrooms}
              onChange={(event) => updateField("bathrooms", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            >
              {bathroomOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Sqft</span>
            <select
              value={propertyDraft.sqft}
              onChange={(event) => updateField("sqft", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            >
              {sqftOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Property type</span>
            <select
              value={propertyDraft.property_type}
              onChange={(event) => updateField("property_type", event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Year built</span>
            <input
              type="number"
              value={propertyDraft.year_built}
              onChange={(event) => updateField("year_built", Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onRunAnalysis}
          className="mt-6 rounded-full bg-red-700 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white"
        >
          {loading ? "Running Analysis..." : "Run Analysis"}
        </button>
      </div>

      {loading && (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          Agents are running for ZIP {propertyDraft.zip_code}. This can take a few moments while the pipeline completes.
        </div>
      )}

      {analysisResult && (
        <>
          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <ScoreGauge score={analysisResult.weighted_total} recommendation={analysisResult.recommendation} />
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Est. Annual Return</p>
                  <div className="mt-3 text-3xl font-black text-slate-900">{analysisResult.metrics.estimated_annual_return_pct}%</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Gross Rental Yield</p>
                  <div className="mt-3 text-3xl font-black text-slate-900">{analysisResult.metrics.gross_rental_yield_pct}%</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">STR vs LTR</p>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    {analysisResult.metrics.str_yield_pct}% / {analysisResult.metrics.ltr_yield_pct}%
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Recommendation</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{propertyDraft.address || "Property analysis complete"}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Asking price {formatCurrency(propertyDraft.asking_price)} compared with estimated value {formatCurrency(propertyDraft.estimated_value)}.
                    </p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-sm font-bold text-white ${badgeColor(analysisResult.recommendation)}`}>
                    {analysisResult.recommendation}
                  </span>
                </div>
                <div className="mt-5">{pdfButton}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <ScoreBars scores={analysisResult.scores} />
            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Investment Report</p>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{analysisResult.report_text}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
