import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SCORE_KEYS = [
  "price_score",
  "neighborhood_score",
  "rental_yield",
  "forecast_score",
  "aqi_score",
  "pollen_score",
  "airbnb_score",
];

const POLLEN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pollenRows(marketData) {
  return Object.values(marketData).map((entry) => ({
    zip: entry.zip_code,
    months: entry.pollen_calendar?.worst_months || ["Mar", "Apr", "May"],
  }));
}

export default function MarketIntel({ featuredZips, marketData, onLoadZip }) {
  const hasData = Object.keys(marketData).length > 0;
  const comparisonRows = featuredZips
    .map((zip) => ({
      zip,
      overall: marketData[zip]?.weighted_total || 0,
      ...Object.fromEntries(SCORE_KEYS.map((key) => [key, marketData[zip]?.scores?.[key] || 0])),
    }))
    .filter((row) => row.overall > 0);

  const topZips = [...comparisonRows].sort((a, b) => b.overall - a.overall).slice(0, 5);
  const firstTrendZip = featuredZips.find((zip) => marketData[zip]?.aqi_trend?.length);
  const aqiTrend = firstTrendZip ? marketData[firstTrendZip].aqi_trend.map((item, index) => ({ day: index + 1, aqi: item.aqi })) : [];

  return (
    <div className="space-y-5">
      {!hasData && (
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">No market cache loaded yet.</p>
          <button type="button" onClick={onLoadZip} className="mt-4 rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white">
            Load Saved ZIPs
          </button>
        </div>
      )}

      {hasData && (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">ZIP Comparison</p>
              <div className="mt-4 h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="zip" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="overall" fill="#991b1b" name="Overall Score" />
                    <Bar dataKey="price_score" fill="#ea580c" name="Price" />
                    <Bar dataKey="rental_yield" fill="#0f766e" name="Rental Yield" />
                    <Bar dataKey="forecast_score" fill="#2563eb" name="Forecast" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Top ZIP Codes This Week</p>
              <div className="mt-4 space-y-3">
                {topZips.map((item, index) => (
                  <div key={item.zip} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        #{index + 1} ZIP {item.zip}
                      </div>
                      <div className="text-xs text-slate-500">Composite real estate score</div>
                    </div>
                    <div className="text-lg font-black text-slate-900">{item.overall.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">AQI Trend Line</p>
              <p className="mt-2 text-sm text-slate-600">Last 30 points for ZIP {firstTrendZip || "N/A"}.</p>
              <div className="mt-4 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aqiTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="aqi" stroke="#0f766e" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Pollen Season Calendar</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3 pr-4">ZIP</th>
                      {POLLEN_MONTHS.map((month) => (
                        <th key={month} className="pb-3 pr-2 text-center">
                          {month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pollenRows(marketData).map((row) => (
                      <tr key={row.zip} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-semibold text-slate-900">{row.zip}</td>
                        {POLLEN_MONTHS.map((month) => (
                          <td key={`${row.zip}-${month}`} className="py-3 text-center">
                            <span
                              className={`inline-block h-7 w-7 rounded-full ${
                                row.months.some((value) => month.startsWith(value.slice(0, 3))) ? "bg-red-600" : "bg-slate-100"
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
