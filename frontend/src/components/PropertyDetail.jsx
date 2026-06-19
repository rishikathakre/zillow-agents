import { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import InvestmentSidebar from "./InvestmentSidebar";
import AgentPipeline from "./AgentPipeline";
import WeatherWidget from "./WeatherWidget";
import AQISection from "./AQISection";
import PollenSection from "./PollenSection";
import ClimateRiskSection from "./ClimateRiskSection";
import SchoolsSection from "./SchoolsSection";
import WalkabilitySection from "./WalkabilitySection";
import MarketIntelSection from "./MarketIntelSection";

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  const prev = useCallback(() => setIdx(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light leading-none">×</button>
      <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-colors">‹</button>
      <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-colors">›</button>
      <img
        src={photos[idx]}
        alt=""
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
        onError={e => { e.target.src = `https://picsum.photos/seed/${idx}/1200/800`; }}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {idx + 1} / {photos.length}
      </div>
    </div>
  );
}

function PhotoGallery({ photos, address }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos || photos.length === 0) return (
    <div className="h-72 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400">
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );

  const main = photos[0];
  const grid = photos.slice(1, 5);

  return (
    <>
      {lightbox !== null && <Lightbox photos={photos} startIdx={lightbox} onClose={() => setLightbox(null)} />}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="flex gap-1.5 h-72 sm:h-[420px]">
          {/* Main large photo — 60% */}
          <div className="flex-[3] relative cursor-pointer overflow-hidden" onClick={() => setLightbox(0)}>
            <img src={main} alt={address} className="w-full h-full object-cover hover:brightness-90 transition-all duration-200"
              onError={e => { e.target.src = "https://picsum.photos/seed/main/1200/800"; }} />
          </div>
          {/* Right 2×2 grid */}
          {grid.length > 0 && (
            <div className="flex-[2] grid grid-cols-2 gap-1.5">
              {grid.map((p, i) => (
                <div key={i} className="relative cursor-pointer overflow-hidden" onClick={() => setLightbox(i + 1)}>
                  <img src={p} alt="" className="w-full h-full object-cover hover:brightness-90 transition-all duration-200"
                    onError={e => { e.target.src = `https://picsum.photos/seed/${i + 2}/800/600`; }} />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Show all button */}
        <button
          onClick={() => setLightbox(0)}
          className="absolute bottom-3 right-3 bg-white border border-gray-300 text-gray-800 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Show all {photos.length} photos
        </button>
      </div>
    </>
  );
}

function Section({ children }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      {children}
    </div>
  );
}

function SectionSkeleton({ label, icon = "⏳", lines = 3 }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <div className="h-4 bg-gray-200 rounded w-36" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-100 rounded mb-2 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export default function PropertyDetail({ listing, onBack }) {
  const [detail, setDetail] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listing?.id) return;
    setLoading(true);
    setDetail(null);
    api.get(`/property/${listing.id}`)
      .then(r => setDetail(r.data))
      .finally(() => setLoading(false));
  }, [listing?.id]);


  const merged = { ...listing, ...(detail?.listing || {}) };
  // Photos: prefer from listing.photo_urls (already on listing), supplement from detail
  const photos = listing?.photo_urls?.length ? listing.photo_urls
    : detail?.photos?.length ? detail.photos
    : listing?.photo_url ? [listing.photo_url] : [];

  const aqiData = detail?.aqi_data ?? { aqi_value: listing?.aqi_value, trend: [] };
  const pollenData = detail?.pollen_data ?? null;
  const climateData = detail?.climate_data ?? null;
  const schoolsData = detail?.schools_data ?? null;
  const walkData = detail?.walkability_data ?? null;
  const marketData = detail?.market_data ?? null;

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-medium transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to listings
      </button>

      {/* Address header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{merged.address}</h1>
        <p className="text-gray-500">{merged.neighborhood ? `${merged.neighborhood} · ` : ""}{merged.city}, {merged.state} {merged.zip_code}</p>
        <div className="flex items-center gap-3 mt-2 text-gray-600 text-sm">
          <span className="capitalize">{merged.property_type?.replace(/_/g, " ")}</span>
          <span>·</span>
          <span>{merged.beds} beds</span>
          <span>·</span>
          <span>{merged.baths} baths</span>
          <span>·</span>
          <span>{merged.sqft?.toLocaleString()} sqft</span>
        </div>
      </div>

      {/* Photo gallery — always visible immediately from listing data */}
      <div className="mb-6">
        <PhotoGallery photos={photos} address={merged.address} />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — 65% */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Agentic AI Pipeline — auto-starts on mount */}
          <AgentPipeline zipCode={merged.zip_code} onAnalysisComplete={setAnalysis} />

          {/* Each section shows its own skeleton while loading */}
          <Section>
            <WeatherWidget zipCode={merged.zip_code} lat={merged.lat} lon={merged.lon} />
          </Section>

          {loading ? (
            <>
              <SectionSkeleton label="Air Quality" icon="🌬️" lines={4} />
              <SectionSkeleton label="Pollen Index" icon="🌿" lines={3} />
              <SectionSkeleton label="Climate Risk" icon="🌊" lines={4} />
              <SectionSkeleton label="Schools" icon="🏫" lines={5} />
              <SectionSkeleton label="Walkability" icon="🚶" lines={3} />
              <SectionSkeleton label="Market Intelligence" icon="📈" lines={5} />
            </>
          ) : (
            <>
              <Section><AQISection data={aqiData} /></Section>
              {pollenData && <Section><PollenSection data={pollenData} /></Section>}
              {climateData && <Section><ClimateRiskSection data={climateData} /></Section>}
              {schoolsData && <Section><SchoolsSection data={schoolsData} /></Section>}
              {walkData && <Section><WalkabilitySection data={walkData} /></Section>}
              {marketData && <Section><MarketIntelSection data={marketData} /></Section>}
            </>
          )}
        </div>

        {/* Right — sticky sidebar 35% */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="lg:sticky lg:top-4 space-y-4">
            <InvestmentSidebar listing={merged} analysis={analysis} />
          </div>
        </div>
      </div>
    </div>
  );
}
