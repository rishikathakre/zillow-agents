import { useState, useEffect } from "react";
import api from "../api/client";
import ListingCard from "./ListingCard";
import MapView from "./MapView";

const FILTERS = [
  { key: "sale_type", label: "For Sale", options: ["For Sale", "For Rent", "Sold"] },
  { key: "price", label: "Price", options: ["Any Price", "Under $300k", "$300k-$600k", "$600k-$1M", "$1M+"] },
  { key: "beds", label: "Beds & Baths", options: ["Any", "1+ bd", "2+ bd", "3+ bd", "4+ bd"] },
  { key: "type", label: "Property Type", options: ["All Types", "Single Family", "Condo", "Townhouse", "Multi-Family"] },
  { key: "more", label: "More Filters", options: [] },
];

function FilterBar({ filters, onChange }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTERS.map(f => {
        const isActive = filters[f.key] && filters[f.key] !== f.options[0];
        return (
          <div key={f.key} className="relative">
            <button
              onClick={() => setOpen(open === f.key ? null : f.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150"
              style={{
                background: isActive ? "rgba(14,165,233,0.08)" : "white",
                color: isActive ? "#0EA5E9" : "#475569",
                borderColor: isActive ? "rgba(14,165,233,0.3)" : "#E2E8F0",
              }}
            >
              {filters[f.key] || f.label}
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open === f.key && f.options.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />
                <div style={{
                  position: "absolute", top: "100%", left: 0, marginTop: 4,
                  background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 20, minWidth: 160,
                  padding: "4px 0", overflow: "hidden",
                }}>
                  {f.options.map(opt => (
                    <button key={opt} onClick={() => { onChange(f.key, opt); setOpen(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        color: filters[f.key] === opt ? "#0EA5E9" : "#475569",
                        fontWeight: filters[f.key] === opt ? 600 : 400,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F0F9FF"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "white", border: "1px solid #E2E8F0" }}>
          <div style={{ height: 180, background: "#E0F2FE" }} />
          <div className="p-4 space-y-2">
            <div className="h-5 rounded w-2/3" style={{ background: "#E2E8F0" }} />
            <div className="h-3 rounded w-full" style={{ background: "#F1F5F9" }} />
            <div className="h-3 rounded w-3/4" style={{ background: "#F1F5F9" }} />
            <div className="h-3 rounded w-1/2 mt-3" style={{ background: "#F1F5F9" }} />
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
  const [meta, setMeta] = useState({});
  const [viewMode, setViewMode] = useState("list");
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
      <div className="flex items-center rounded-lg p-1 shrink-0" style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}>
        <button onClick={() => setViewMode("list")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
          style={{
            background: viewMode === "list" ? "white" : "transparent",
            color: viewMode === "list" ? "#0F172A" : "#94A3B8",
            boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          List
        </button>
        <button onClick={() => setViewMode("map")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
          style={{
            background: viewMode === "map" ? "white" : "transparent",
            color: viewMode === "map" ? "#0F172A" : "#94A3B8",
            boxShadow: viewMode === "map" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }}>
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
    <div className="text-center py-20" style={{ color: "#475569" }}>
      <p className="text-lg">{error}</p>
    </div></>
  );

  if (!listings.length) return (
    <>
      {topBar}
      {meta.rateLimited ? (
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <div className="w-full max-w-xl rounded-xl p-6 text-center" style={{
            background: "#FFFBEB", border: "1px solid #FDE68A",
          }}>
            <h3 style={{ fontWeight: 700, color: "#92400E", fontSize: 18, marginBottom: 4 }}>
              Real listings temporarily unavailable
            </h3>
            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
              {meta.message || "API rate limit reached. Your quota resets hourly -- please try again in a few minutes."}
            </p>
            {meta.city && (
              <p style={{ marginTop: 12, color: "#94A3B8", fontSize: 12, fontWeight: 500 }}>
                Searching: {meta.city}{meta.state ? `, ${meta.state}` : ""} &middot; {query}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p style={{ fontSize: 18, color: "#475569" }}>No listings found for &ldquo;{query}&rdquo;.</p>
          <p style={{ fontSize: 14, marginTop: 4, color: "#94A3B8" }}>Try a different city or ZIP code.</p>
        </div>
      )}
    </>
  );

  const count = listings.length;

  if (viewMode === "map") {
    return (
      <>
        {topBar}
        <p style={{ color: "#94A3B8", fontSize: 13, marginBottom: 12 }}>{count} properties in {meta.city ? `${meta.city}, ${meta.state}` : query}</p>
        <MapView listings={listings} onSelect={onSelect} highlightId={highlightId} onHighlight={setHighlightId} />
      </>
    );
  }

  return (
    <>
      {topBar}
      <p style={{ color: "#94A3B8", fontSize: 13, marginBottom: 12 }}>{count} properties in {meta.city ? `${meta.city}, ${meta.state}` : query}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map(l => (
          <ListingCard key={l.id} listing={l} onClick={onSelect} highlighted={l.id === highlightId} />
        ))}
      </div>
    </>
  );
}
