import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function MarketIntelSection({ data }) {
  if (!data) return null;
  const { price_history = [], dom_history = [], nearby_zips = [], metrics = {} } = data;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900">Market Intelligence</h3>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Median Price", value: `$${(metrics.median_price || 0).toLocaleString()}` },
          { label: "Price/sqft", value: `$${metrics.price_per_sqft || 0}` },
          { label: "Days on Market", value: `${metrics.dom || 0}d` },
          { label: "Rental Yield", value: `${metrics.rental_yield || 0}%` },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-gray-400 text-xs">{m.label}</div>
            <div className="font-bold text-gray-900 mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      {/* 24-month price trend */}
      {price_history.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">24-Month Median Price Trend</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={price_history} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={5} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Median Price"]} />
                <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Days on market */}
      {dom_history.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">Days on Market (12 months)</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dom_history} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip formatter={v => [v, "Days"]} />
                <Bar dataKey="days" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Nearby ZIPs */}
      {nearby_zips.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">Nearby ZIP Comparison ($/sqft)</h4>
          <div className="space-y-2">
            {nearby_zips.map((z, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-14 shrink-0">{z.zip}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (z.price_per_sqft / 1000) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-700 w-16 text-right">${z.price_per_sqft}/sqft</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
