import { useState } from "react";
import SearchBar from "./SearchBar";
import ListingGrid from "./ListingGrid";
import PropertyDetail from "./PropertyDetail";

const FEATURED = [
  { query: "New York, NY", label: "New York", emoji: "🗽" },
  { query: "Miami, FL", label: "Miami", emoji: "🌴" },
  { query: "Austin, TX", label: "Austin", emoji: "🤠" },
  { query: "Seattle, WA", label: "Seattle", emoji: "🌧️" },
  { query: "Denver, CO", label: "Denver", emoji: "🏔️" },
  { query: "Nashville, TN", label: "Nashville", emoji: "🎸" },
];

function HomeView({ onSearch }) {
  return (
    <div className="space-y-10">
      {/* Hero search */}
      <div className="text-center space-y-4 pt-8">
        <h1 className="text-4xl font-extrabold text-gray-900">
          Find your next investment property
        </h1>
        <p className="text-gray-500 text-lg">
          Real AQI, pollen, flood risk & AI scoring — the data Zillow removed.
        </p>
        <SearchBar onSearch={onSearch} />
      </div>

      {/* Featured cities */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Explore popular markets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FEATURED.map(f => (
            <button key={f.query} onClick={() => onSearch(f.query)}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group">
              <span className="text-3xl">{f.emoji}</span>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Why PropIQ callout */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <h3 className="font-bold text-xl mb-3">Why PropIQ shows what Zillow won't</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { icon: "🌬️", title: "AQI & Air Quality", desc: "Real-time air quality data Zillow quietly removed in 2025." },
            { icon: "🌊", title: "Flood & Climate Risk", desc: "FEMA flood zones, wildfire risk, and heat exposure — all in one score." },
            { icon: "🤖", title: "AI Investment Scoring", desc: "8 specialized agents analyze each ZIP code for true investment potential." },
          ].map(c => (
            <div key={c.title} className="flex gap-3">
              <span className="text-2xl shrink-0">{c.icon}</span>
              <div>
                <div className="font-semibold">{c.title}</div>
                <div className="text-slate-300 text-xs mt-1">{c.desc}</div>
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
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </button>
        <div className="flex-1">
          <SearchBar onSearch={onNewSearch} initialValue={query} />
        </div>
      </div>
      <div className="text-gray-600 text-sm">Showing listings in <span className="font-semibold text-gray-900">{query}</span> — powered by Zillow</div>
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
