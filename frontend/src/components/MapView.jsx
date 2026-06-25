import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ListingCard from "./ListingCard";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function pinIcon(score) {
  const color = score >= 75 ? "#10B981" : score >= 55 ? "#F59E0B" : "#EF4444";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="18" y="22" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="Arial">${Math.round(score)}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

function FitBounds({ listings }) {
  const map = useMap();
  useEffect(() => {
    if (!listings.length) return;
    const bounds = L.latLngBounds(listings.map(l => [l.lat, l.lon]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [listings, map]);
  return null;
}

export default function MapView({ listings, onSelect, highlightId, onHighlight }) {
  const listRef = useRef(null);
  const cardRefs = useRef({});

  const center = listings.length
    ? [listings.reduce((s, l) => s + l.lat, 0) / listings.length, listings.reduce((s, l) => s + l.lon, 0) / listings.length]
    : [39.5, -98.35];

  function handlePinClick(listing) {
    onHighlight(listing.id);
    const el = cardRefs.current[listing.id];
    if (el && listRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-220px)] min-h-[500px] rounded-xl overflow-hidden"
      style={{ border: "1px solid #E2E8F0" }}>
      {/* Map */}
      <div className="flex-[3] relative">
        <MapContainer center={center} zoom={12} className="w-full h-full" zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds listings={listings} />
          {listings.map(l => (
            <Marker
              key={l.id}
              position={[l.lat, l.lon]}
              icon={pinIcon(l.propiq_score)}
              eventHandlers={{ click: () => handlePinClick(l) }}
            >
              <Popup>
                <div className="text-sm min-w-[160px]" style={{ color: "#0F172A", background: "white", margin: -12, padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                  <div className="font-bold">${l.price?.toLocaleString()}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#475569" }}>{l.address}</div>
                  <div className="text-xs" style={{ color: "#94A3B8" }}>{l.beds}bd / {l.baths}ba / {l.sqft?.toLocaleString()} sqft</div>
                  <button onClick={() => onSelect(l)}
                    className="mt-2 w-full text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                    style={{ background: "#0EA5E9" }}>
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Listing cards */}
      <div ref={listRef} className="flex-[2] overflow-y-auto p-3 space-y-3"
        style={{ background: "#F8FAFC", borderLeft: "1px solid #E2E8F0" }}>
        {listings.map(l => (
          <div key={l.id} ref={el => { cardRefs.current[l.id] = el; }}>
            <ListingCard listing={l} onClick={onSelect} highlighted={l.id === highlightId} />
          </div>
        ))}
      </div>
    </div>
  );
}
