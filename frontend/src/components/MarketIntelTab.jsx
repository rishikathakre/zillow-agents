import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";

export default function MarketIntelTab({ result }) {
  if (!result) return null;
  const mi = result.market_intelligence || {};
  const priceTrend = mi.median_price_trend || [];
  const domTrend = mi.days_on_market || [];
  const nearbyZips = mi.nearby_zips_comparison || [];
  const rental = mi.rental_comparison || {};
  const summary = mi.market_summary || [];

  function formatPrice(v) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  }

  return (
    <div className="space-y-7">
      {/* Market summary bullets */}
      {summary.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Market Summary</h3>
          <ul className="space-y-1.5">
            {summary.map((s, i) => (
              <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key market stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Price / Sq Ft", value: mi.price_per_sqft ? `$${mi.price_per_sqft}` : "N/A" },
          { label: "Gentrification Score", value: mi.gentrification_score != null ? `${mi.gentrification_score}/100` : "N/A" },
          { label: "Employment Growth", value: mi.employment_growth_pct != null ? `${mi.employment_growth_pct}%` : "N/A" },
          { label: "Rental Yield", value: rental.this_zip ? `${rental.this_zip}%` : "N/A" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* 24-month price trend */}
      {priceTrend.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Median Home Price Trend (24 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={priceTrend} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={3} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={formatPrice} width={55} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(v) => [formatPrice(v), "Median Price"]}
              />
              <Line type="monotone" dataKey="price" stroke="#0f172a" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Days on market */}
      {domTrend.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Days on Market Trend (12 months)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={domTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 9 }} width={30} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="days" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rental yield comparison */}
      {rental.this_zip && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Rental Yield Comparison</h3>
          <div className="space-y-2">
            {[
              { label: `ZIP ${result.zip_code}`, value: rental.this_zip, color: "#0f172a" },
              { label: "City Average", value: rental.city_avg, color: "#1e40af" },
              { label: "National Average", value: rental.national_avg, color: "#94a3b8" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 w-36 flex-shrink-0">{label}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (value / 12) * 100)}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 w-10 text-right">{value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby ZIP comparison */}
      {nearbyZips.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Price/Sq Ft vs Nearby ZIPs</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={[
                { zip: result.zip_code, price: mi.price_per_sqft || 0, fill: "#0f172a" },
                ...nearbyZips.map((z) => ({ zip: z.zip, price: z.price_per_sqft, fill: "#94a3b8" })),
              ]}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
            >
              <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="zip" tick={{ fontSize: 9 }} width={55} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`$${v}/sqft`]} />
              <Bar dataKey="price" radius={[0, 4, 4, 0]} fill="#1e40af" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
