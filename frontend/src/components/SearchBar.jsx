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
      <form onSubmit={submit} className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 shadow-lg focus-within:border-blue-500 transition-colors">
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Search city, neighborhood, or ZIP code..."
          className="flex-1 outline-none text-gray-800 text-base placeholder-gray-400 bg-transparent"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors">
          Search
        </button>
      </form>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2 text-xs text-gray-400 font-semibold uppercase tracking-wide border-b border-gray-100">
            {query.trim() ? "Suggestions" : "Popular cities"}
          </div>
          {filtered.map(s => (
            <button key={s} onMouseDown={() => pick(s)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-gray-700 text-sm transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
