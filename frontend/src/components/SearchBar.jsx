import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL",
  "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "San Francisco, CA",
  "Indianapolis, IN", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Miami, FL", "Atlanta, GA", "Boston, MA", "Portland, OR",
  "Las Vegas, NV", "Minneapolis, MN", "New Orleans, LA", "Tucson, AZ",
];

export default function SearchBar({ onSearch, initialValue = "" }) {
  const [query, setQuery] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleChange(e) {
    const v = e.target.value;
    setQuery(v);
    if (v.trim().length > 0) {
      setFiltered(SUGGESTIONS.filter(s => s.toLowerCase().includes(v.toLowerCase())).slice(0, 6));
      setOpen(true);
    } else {
      setFiltered(SUGGESTIONS.slice(0, 6));
      setOpen(true);
    }
  }

  function handleFocus() {
    setFiltered(query.trim() ? SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : SUGGESTIONS.slice(0, 6));
    setOpen(true);
  }

  function pick(s) {
    setQuery(s);
    setOpen(false);
    onSearch(s);
  }

  function submit(e) {
    e.preventDefault();
    if (query.trim()) { setOpen(false); onSearch(query.trim()); }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-2xl mx-auto">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 transition-all duration-150"
        style={{
          background: "white",
          border: "1px solid #BAE6FD",
          borderRadius: 10,
          padding: "4px 4px 4px 14px",
          boxShadow: "0 1px 3px rgba(14,165,233,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#0EA5E9";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.12)";
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.style.borderColor = "#BAE6FD";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(14,165,233,0.08), 0 1px 2px rgba(0,0,0,0.04)";
          }
        }}
      >
        <svg className="w-5 h-5 shrink-0" style={{ color: "#94A3B8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Search city, neighborhood, or ZIP code..."
          className="flex-1 outline-none text-sm px-2 py-3"
          style={{ color: "#0F172A", background: "transparent" }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
            style={{ color: "#94A3B8" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#0F172A"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#94A3B8"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button type="submit" style={{
          background: "#0EA5E9", color: "white", border: "none",
          borderRadius: 8, padding: "8px 18px", fontSize: 13,
          fontWeight: 600, cursor: "pointer", transition: "background 150ms",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#0284C7"}
        onMouseLeave={(e) => e.currentTarget.style.background = "#0EA5E9"}
        >
          Search
        </button>
      </form>

      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 8,
          background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 16px", fontSize: 11, color: "#94A3B8",
            fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
            borderBottom: "1px solid #E2E8F0",
          }}>
            {query.trim() ? "Suggestions" : "Popular cities"}
          </div>
          {filtered.map(s => (
            <button key={s} onMouseDown={() => pick(s)}
              className="w-full text-left flex items-center gap-3 transition-colors"
              style={{ padding: "10px 16px", fontSize: 13, color: "#475569" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F0F9FF"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <svg className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
