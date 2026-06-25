import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const tooltipStyle = {
  contentStyle: { background: "white", border: "1px solid #E2E8F0", borderRadius: 8, color: "#0F172A", fontSize: 12 },
  itemStyle: { color: "#0F172A" },
  labelStyle: { color: "#94A3B8" },
};

export default function MarketIntelSection({ data }) {
  if (!data) return null;
  const { price_history = [], dom_history = [], nearby_zips = [], metrics = {} } = data;

  return (
    <div className="space-y-6">
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Market Intelligence</h3>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Median Price", value: `$${(metrics.median_price || 0).toLocaleString()}` },
          { label: "Price/sqft", value: `$${metrics.price_per_sqft || 0}` },
          { label: "Days on Market", value: `${metrics.dom || 0}d` },
          { label: "Rental Yield", value: `${metrics.rental_yield || 0}%` },
        ].map(m => (
          <div key={m.label} className="text-center" style={{
            background: "#F8FAFC", border: "1px solid #E2E8F0",
            borderRadius: 12, padding: 12,
          }}>
            <div style={{ color: "#94A3B8", fontSize: 11 }}>{m.label}</div>
            <div style={{ fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* 24-month price trend */}
      {price_history.length > 0 && (
        <div>
          <h4 style={{ fontWeight: 600, color: "#0F172A", marginBottom: 8, fontSize: 13 }}>24-Month Median Price Trend</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={price_history} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94A3B8" }} interval={5} stroke="#E2E8F0" />
                <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} stroke="#E2E8F0" />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Median Price"]} {...tooltipStyle} />
                <Line type="monotone" dataKey="price" stroke="#0EA5E9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Days on market */}
      {dom_history.length > 0 && (
        <div>
          <h4 style={{ fontWeight: 600, color: "#0F172A", marginBottom: 8, fontSize: 13 }}>Days on Market (12 months)</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dom_history} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94A3B8" }} stroke="#E2E8F0" />
                <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} stroke="#E2E8F0" />
                <Tooltip formatter={v => [v, "Days"]} {...tooltipStyle} />
                <Bar dataKey="days" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Nearby ZIPs */}
      {nearby_zips.length > 0 && (
        <div>
          <h4 style={{ fontWeight: 600, color: "#0F172A", marginBottom: 8, fontSize: 13 }}>Nearby ZIP Comparison ($/sqft)</h4>
          <div className="space-y-2">
            {nearby_zips.map((z, i) => (
              <div key={i} className="flex items-center gap-3">
                <span style={{ fontSize: 12, color: "#94A3B8", width: 56, flexShrink: 0, fontFamily: "monospace" }}>{z.zip}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                  <div className="h-full rounded-full" style={{ background: "#0EA5E9", width: `${Math.min(100, (z.price_per_sqft / 1000) * 100)}%` }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", width: 64, textAlign: "right" }}>${z.price_per_sqft}/sqft</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
