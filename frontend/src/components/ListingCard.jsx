function aqiColor(aqi) {
  if (aqi <= 50) return "#10B981";
  if (aqi <= 100) return "#F59E0B";
  return "#EF4444";
}

function aqiTextColor(aqi) {
  if (aqi <= 50) return "#065F46";
  if (aqi <= 100) return "#92400E";
  return "#991B1B";
}

function aqiLabel(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "USG";
  return "Unhealthy";
}

export default function ListingCard({ listing, onClick, highlighted = false }) {
  const {
    id, address, city, state, zip_code, price, beds, baths, sqft,
    propiq_score, aqi_value, photo_url, photo_urls, property_type,
    neighborhood, source, days_on_market, price_reduced,
  } = listing;

  const imgSrc = photo_url || (photo_urls && photo_urls[0]) || null;

  return (
    <div
      onClick={() => onClick(listing)}
      className="group cursor-pointer overflow-hidden transition-all duration-200"
      style={{
        background: "white",
        border: `1px solid ${highlighted ? "#BAE6FD" : "#E2E8F0"}`,
        borderRadius: 12,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#BAE6FD";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(14,165,233,0.12), 0 1px 4px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = highlighted ? "#BAE6FD" : "#E2E8F0";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Photo */}
      <div className="relative overflow-hidden" style={{ height: 180, background: "#E0F2FE" }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={address}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={e => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ display: imgSrc ? "none" : "flex", color: "#94A3B8", background: "#E0F2FE" }}
        >
          <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 22V12h6v10" />
          </svg>
          <span className="text-xs">No photo available</span>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(12,26,46,0.5) 100%)" }} />

        {/* AQI badge */}
        {aqi_value != null && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5"
            style={{
              background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(0,0,0,0.05)", borderRadius: 20,
              padding: "3px 8px", fontSize: 10, fontWeight: 600, color: aqiTextColor(aqi_value),
            }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: aqiColor(aqi_value) }} />
            AQI {aqiLabel(aqi_value)}
          </div>
        )}

        {/* Score badge */}
        {propiq_score != null && (
          <div className="absolute top-3 right-3"
            style={{
              background: "#0EA5E9", border: "1px solid rgba(255,255,255,0.2)",
              color: "white", borderRadius: 20, padding: "3px 8px",
              fontSize: 10, fontWeight: 700,
            }}>
            {propiq_score}/100
          </div>
        )}

        {/* Property type */}
        {property_type && (
          <div className="absolute bottom-3 left-3 capitalize"
            style={{
              background: "rgba(12,26,46,0.7)", backdropFilter: "blur(4px)",
              color: "#E0F2FE", borderRadius: 5, padding: "2px 7px",
              fontSize: 9, fontWeight: 500,
            }}>
            {property_type.replace(/_/g, " ")}
          </div>
        )}

        {price_reduced && (
          <div className="absolute top-10 right-3" style={{
            background: "#EF4444", color: "white", fontSize: 10,
            padding: "2px 6px", borderRadius: 4, fontWeight: 600,
          }}>
            Price cut
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px 14px" }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 2 }}>
          ${price?.toLocaleString()}
        </p>
        <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
          {address}
        </p>
        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>
          {city}, {state} {zip_code}
        </p>
        <div style={{ height: 1, background: "#F1F5F9", margin: "8px 0" }} />
        <div className="flex gap-3" style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
          {beds > 0 && <span>{beds} bd</span>}
          {baths > 0 && <span>{baths} ba</span>}
          {sqft > 0 && <span>{sqft?.toLocaleString()} sqft</span>}
        </div>
        {days_on_market > 0 && (
          <p style={{ color: "#CBD5E1", fontSize: 11, marginTop: 6 }}>{days_on_market} days on market</p>
        )}
      </div>
    </div>
  );
}
