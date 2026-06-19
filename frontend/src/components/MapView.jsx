import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ListingCard from "./ListingCard";

// Fix leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function pinIcon(score) {
  const color = score >= 75 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#ef4444";
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
    <div className="flex gap-0 h-[calc(100vh-220px)] min-h-[500px] rounded-2xl overflow-hidden border border-gray-200">
      {/* Map — 60% */}
      <div className="flex-[3] relative">
        <MapContainer center={center} zoom={12} className="w-full h-full" zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                <div className="text-sm min-w-[160px]">
                  <div className="font-bold text-gray-900">${l.price?.toLocaleString()}</div>
                  <div className="text-gray-600 text-xs mt-0.5">{l.address}</div>
                  <div className="text-gray-400 text-xs">{l.beds}bd · {l.baths}ba · {l.sqft?.toLocaleString()} sqft</div>
                  <button onClick={() => onSelect(l)} className="mt-2 w-full bg-blue-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Listing cards — 40% scrollable */}
      <div ref={listRef} className="flex-[2] overflow-y-auto bg-gray-50 border-l border-gray-200 p-3 space-y-3">
        {listings.map(l => (
          <div key={l.id} ref={el => { cardRefs.current[l.id] = el; }}>
            <ListingCard listing={l} onClick={onSelect} highlighted={l.id === highlightId} />
          </div>
        ))}
      </div>
    </div>
  );
}
