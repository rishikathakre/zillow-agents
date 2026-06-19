function scoreColor(score) {
  if (score >= 75) return "bg-green-500";
  if (score >= 55) return "bg-yellow-500";
  return "bg-red-500";
}

function aqiColor(aqi) {
  if (aqi <= 50) return "bg-green-500";
  if (aqi <= 100) return "bg-yellow-400";
  if (aqi <= 150) return "bg-orange-500";
  return "bg-red-500";
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

  // Use first real photo; fallback to a blank grey placeholder (no random stock images)
  const imgSrc = photo_url || (photo_urls && photo_urls[0]) || null;

  return (
    <div
      onClick={() => onClick(listing)}
      className={`group cursor-pointer rounded-xl overflow-hidden bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${highlighted ? "ring-2 ring-blue-500 shadow-xl" : "shadow-sm border border-gray-100"}`}
    >
      {/* Photo */}
      <div className="relative h-52 overflow-hidden bg-gray-200">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={address}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        {/* No-photo placeholder */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100"
          style={{ display: imgSrc ? "none" : "flex" }}
        >
          <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 22V12h6v10" />
          </svg>
          <span className="text-xs">No photo available</span>
        </div>

        {/* PropIQ score badge — top right */}
        {propiq_score != null && (
          <div className={`absolute top-2.5 right-2.5 ${scoreColor(propiq_score)} text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md`}>
            {propiq_score}/100
          </div>
        )}
        {/* AQI badge — top left */}
        {aqi_value != null && (
          <div className={`absolute top-2.5 left-2.5 ${aqiColor(aqi_value)} text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md`}>
            AQI {aqiLabel(aqi_value)}
          </div>
        )}
        {/* Property type + source */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2.5 pb-2">
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg capitalize">
            {property_type?.replace(/_/g, " ")}
          </div>
          {source === "zillow" && (
            <div className="bg-blue-600/80 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 9.5l1.5 1L12 4l8.5 6.5 1.5-1L12 2zM4 11.5V21h16v-9.5L12 6 4 11.5z"/>
              </svg>
              Zillow
            </div>
          )}
        </div>

        {/* Price reduced badge */}
        {price_reduced && (
          <div className="absolute top-9 right-2.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-md">
            Price cut
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-bold text-gray-900 text-lg leading-tight">
          ${price?.toLocaleString()}
        </p>
        <p className="text-gray-700 text-sm mt-0.5 truncate font-medium">{address}</p>
        <p className="text-gray-400 text-xs truncate mt-0.5">
          {city}, {state} {zip_code}
        </p>
        <div className="flex items-center gap-2 mt-2 text-gray-600 text-sm">
          {beds > 0 && <><span className="font-medium">{beds} <span className="font-normal text-gray-400">bd</span></span><span className="text-gray-200">|</span></>}
          {baths > 0 && <><span className="font-medium">{baths} <span className="font-normal text-gray-400">ba</span></span><span className="text-gray-200">|</span></>}
          {sqft > 0 && <span className="font-medium">{sqft?.toLocaleString()} <span className="font-normal text-gray-400">sqft</span></span>}
        </div>
        {days_on_market > 0 && (
          <p className="text-gray-400 text-xs mt-1">{days_on_market} days on market</p>
        )}
      </div>
    </div>
  );
}
