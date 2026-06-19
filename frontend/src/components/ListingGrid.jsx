import { useState, useEffect } from "react";
import api from "../api/client";
import ListingCard from "./ListingCard";
import MapView from "./MapView";

const FILTERS = [
  { key: "sale_type", label: "For Sale", options: ["For Sale", "For Rent", "Sold"] },
  { key: "price", label: "Price", options: ["Any Price", "Under $300k", "$300k–$600k", "$600k–$1M", "$1M+"] },
  { key: "beds", label: "Beds & Baths", options: ["Any", "1+ bd", "2+ bd", "3+ bd", "4+ bd"] },
  { key: "type", label: "Property Type", options: ["All Types", "Single Family", "Condo", "Townhouse", "Multi-Family"] },
  { key: "more", label: "More Filters", options: [] },
];

function FilterBar({ filters, onChange }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTERS.map(f => (
        <div key={f.key} className="relative">
          <button
            onClick={() => setOpen(open === f.key ? null : f.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
              filters[f.key] && filters[f.key] !== f.options[0]
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
            }`}
          >
            {filters[f.key] || f.label}
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === f.key && f.options.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-40 py-1 overflow-hidden">
                {f.options.map(opt => (
                  <button key={opt} onClick={() => { onChange(f.key, opt); setOpen(null); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${filters[f.key] === opt ? "font-semibold text-blue-600" : "text-gray-700"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-white animate-pulse shadow-sm border border-gray-100">
          <div className="h-52 bg-gray-200" />
          <div className="p-4 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ListingGrid({ query, onSelect }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({});           // city, state, source, rate_limited, message
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"
  const [filters, setFilters] = useState({});
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/listings/${encodeURIComponent(query)}`)
      .then(r => {
        setListings(r.data.listings || []);
        setMeta({
          city:        r.data.city,
          state:       r.data.state,
          source:      r.data.source,
          rateLimited: r.data.rate_limited,
          message:     r.data.message,
          count:       r.data.count,
        });
      })
      .catch(() => setError("Failed to load listings."))
      .finally(() => setLoading(false));
  }, [query]);

  function handleFilterChange(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  const topBar = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      <div className="flex-1">
        <FilterBar filters={filters} onChange={handleFilterChange} />
      </div>
      {/* List / Map toggle */}
      <div className="flex items-center bg-gray-100 rounded-full p-1 shrink-0">
        <button onClick={() => setViewMode("list")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          List
        </button>
        <button onClick={() => setViewMode("map")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === "map" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Map
        </button>
      </div>
    </div>
  );

  if (loading) return <>{topBar}<SkeletonGrid /></>;

  if (error) return (
    <>{topBar}
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg">{error}</p>
    </div></>
  );

  if (!listings.length) return (
    <>
      {topBar}
      {meta.rateLimited ? (
        /* Rate-limited: show an honest banner with the real location name */
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <div className="w-full max-w-xl bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">⏳</div>
            <h3 className="font-bold text-amber-900 text-lg mb-1">
              Real Zillow listings temporarily unavailable
            </h3>
            <p className="text-amber-700 text-sm leading-relaxed">
              {meta.message || "Zillow API rate limit reached. Your RapidAPI quota resets hourly — please try again in a few minutes."}
            </p>
            {meta.city && (
              <p className="mt-3 text-amber-600 text-xs font-medium">
                Searching: {meta.city}{meta.state ? `, ${meta.state}` : ""} · {query}
              </p>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 max-w-xl w-full text-center">
            <p className="text-blue-700 text-sm font-medium mb-1">Tip: Listings are cached for 24 hours</p>
            <p className="text-blue-600 text-xs">
              Once the rate limit clears, search again and results will be cached so you won't hit the limit again for 24 hours.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No listings found for "{query}".</p>
          <p className="text-sm mt-1">Try a different city or ZIP code.</p>
        </div>
      )}
    </>
  );

  const count = listings.length;

  if (viewMode === "map") {
    return (
      <>
        {topBar}
        <p className="text-gray-500 text-sm mb-3">{count} homes</p>
        <MapView listings={listings} onSelect={onSelect} highlightId={highlightId} onHighlight={setHighlightId} />
      </>
    );
  }

  return (
    <>
      {topBar}
      <p className="text-gray-500 text-sm mb-3">{count} homes</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {listings.map(l => (
          <ListingCard key={l.id} listing={l} onClick={onSelect} highlighted={l.id === highlightId} />
        ))}
      </div>
    </>
  );
}
