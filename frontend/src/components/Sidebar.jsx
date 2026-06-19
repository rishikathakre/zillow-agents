const WEIGHT_LABELS = [
  ["price_score", "Price Momentum"],
  ["neighborhood_score", "Neighborhood"],
  ["rental_yield", "Rental Yield"],
  ["forecast_score", "Forecast"],
  ["aqi_score", "AQI"],
  ["pollen_score", "Pollen"],
  ["airbnb_score", "Airbnb STR"],
];

export default function Sidebar({
  featuredZips,
  activeZip,
  setActiveZip,
  customZipInput,
  setCustomZipInput,
  addZip,
  removeZip,
  refreshMarketData,
  clearMarketCache,
  weights,
  onWeightChange,
}) {
  const total = WEIGHT_LABELS.reduce((sum, [key]) => sum + Number(weights[key] || 0), 0);

  return (
    <aside className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Controls</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">Dashboard Sidebar</h2>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-700">Featured ZIP codes</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {featuredZips.map((zip) => (
            <button
              key={zip}
              type="button"
              onClick={() => setActiveZip(zip)}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                activeZip === zip ? "bg-red-700 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              <span>{zip}</span>
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  removeZip(zip);
                }}
                className="cursor-pointer rounded-full bg-black/10 px-2 py-0.5 text-xs"
              >
                ×
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Add a custom ZIP</label>
        <div className="flex gap-2">
          <input
            value={customZipInput}
            onChange={(event) => setCustomZipInput(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-400"
            placeholder="e.g. 30301"
          />
          <button type="button" onClick={addZip} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
            Add
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button type="button" onClick={refreshMarketData} className="rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white">
          Refresh Market Data
        </button>
        <button type="button" onClick={clearMarketCache} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
          Clear Market Cache
        </button>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">ZIP scoring model weights</p>
          <span className={`text-xs font-semibold ${total === 100 ? "text-emerald-600" : "text-amber-600"}`}>{total}%</span>
        </div>
        <div className="mt-3 space-y-4">
          {WEIGHT_LABELS.map(([key, label]) => (
            <label key={key} className="block">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-slate-500">{weights[key]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights[key]}
                onChange={(event) => onWeightChange(key, event.target.value)}
                className="w-full accent-red-700"
              />
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
