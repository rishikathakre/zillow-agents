import { useState } from "react";
import SearchBar from "./SearchBar";
import ListingGrid from "./ListingGrid";
import PropertyDetail from "./PropertyDetail";

const FEATURED = [
  { query: "New York, NY", label: "New York" },
  { query: "Miami, FL", label: "Miami" },
  { query: "Austin, TX", label: "Austin" },
  { query: "Seattle, WA", label: "Seattle" },
  { query: "Denver, CO", label: "Denver" },
  { query: "Nashville, TN", label: "Nashville" },
];

function HomeView({ onSearch }) {
  return (
    <div className="space-y-0">
      {/* Hero */}
      <div style={{
        background: "#F0F9FF",
        borderBottom: "1px solid #BAE6FD",
        padding: "32px 32px 24px",
        textAlign: "center",
        borderRadius: "12px 12px 0 0",
        marginBottom: 0,
      }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: "#7DD3FC",
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10,
        }}>
          Agentic AI &middot; 8 specialist agents &middot; Real data
        </p>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: "#0C4A6E",
          letterSpacing: "-0.03em", marginBottom: 6,
        }}>
          Find your next investment property
        </h1>
        <p style={{ fontSize: 13, color: "#0369A1", marginBottom: 20 }}>
          Real AQI, pollen, flood risk &amp; AI scoring -- the data Zillow removed.
        </p>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <SearchBar onSearch={onSearch} />
        </div>

        {/* City chips */}
        <div className="flex gap-2 flex-wrap justify-center" style={{ marginTop: 12 }}>
          {FEATURED.map(f => (
            <button key={f.query} onClick={() => onSearch(f.query)}
              style={{
                border: "1px solid #BAE6FD", borderRadius: 20,
                padding: "4px 12px", fontSize: 11, color: "#0369A1",
                background: "white", cursor: "pointer", fontWeight: 500,
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0EA5E9";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.borderColor = "#0EA5E9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#0369A1";
                e.currentTarget.style.borderColor = "#BAE6FD";
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Why PropIQ */}
      <div style={{
        background: "white", border: "1px solid #E2E8F0",
        borderRadius: 12, padding: 24, marginTop: 24,
      }}>
        <h3 style={{ fontWeight: 600, color: "#0F172A", fontSize: 18, marginBottom: 16 }}>
          Why PropIQ shows what Zillow won't
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { title: "AQI & Air Quality", desc: "Real-time air quality data Zillow quietly removed in 2025." },
            { title: "Flood & Climate Risk", desc: "FEMA flood zones, wildfire risk, and heat exposure -- all in one score." },
            { title: "AI Investment Scoring", desc: "8 specialized agents analyze each ZIP code for true investment potential." },
          ].map(c => (
            <div key={c.title} className="flex gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#0EA5E9" }} />
              <div>
                <div style={{ fontWeight: 600, color: "#0F172A" }}>{c.title}</div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsView({ query, onSelect, onBack, onNewSearch }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 transition-colors text-sm"
          style={{ color: "#94A3B8" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#0F172A"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#94A3B8"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </button>
        <div className="flex-1">
          <SearchBar onSearch={onNewSearch} initialValue={query} />
        </div>
      </div>
      <ListingGrid query={query} onSelect={onSelect} />
    </div>
  );
}

export default function SearchProperty() {
  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  function handleSearch(q) {
    setQuery(q);
    setView("results");
    setSelected(null);
  }

  function handleSelect(listing) {
    setSelected(listing);
    setView("detail");
  }

  if (view === "detail" && selected) {
    return (
      <PropertyDetail
        listing={selected}
        onBack={() => setView("results")}
      />
    );
  }

  if (view === "results") {
    return (
      <ResultsView
        query={query}
        onSelect={handleSelect}
        onBack={() => setView("home")}
        onNewSearch={handleSearch}
      />
    );
  }

  return <HomeView onSearch={handleSearch} />;
}
