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
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light leading-none">x</button>
      <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-colors">&#8249;</button>
      <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-colors">&#8250;</button>
      <img src={photos[idx]} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{idx + 1} / {photos.length}</div>
    </div>
  );
}

function PhotoGallery({ photos, address }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos || photos.length === 0) return (
    <div className="h-72 rounded-xl flex items-center justify-center" style={{ background: "#E0F2FE", color: "#94A3B8" }}>
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
      <div className="relative rounded-xl overflow-hidden">
        <div className="flex gap-[2px] h-72 sm:h-[420px]">
          <div className="flex-[3] relative cursor-pointer overflow-hidden" style={{ background: "#E0F2FE" }} onClick={() => setLightbox(0)}>
            <img src={main} alt={address} className="w-full h-full object-cover hover:brightness-95 transition-all duration-200" />
          </div>
          {grid.length > 0 && (
            <div className="flex-[2] grid grid-cols-2 gap-[2px]">
              {grid.map((p, i) => (
                <div key={i} className="relative cursor-pointer overflow-hidden" style={{ background: "#E0F2FE" }} onClick={() => setLightbox(i + 1)}>
                  <img src={p} alt="" className="w-full h-full object-cover hover:brightness-95 transition-all duration-200" />
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setLightbox(0)}
          className="absolute bottom-4 right-4 flex items-center gap-1.5"
          style={{
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
            border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px",
            fontSize: 11, fontWeight: 600, color: "#0F172A", cursor: "pointer",
          }}
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
    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      {children}
    </div>
  );
}

function SectionSkeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse" style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 rounded w-36" style={{ background: "#E2E8F0" }} />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 rounded mb-2 ${i === lines - 1 ? "w-2/3" : "w-full"}`} style={{ background: "#F1F5F9" }} />
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
    <div className="page-enter">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 mb-4 font-medium transition-colors text-sm"
        style={{ color: "#94A3B8" }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#0F172A"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#94A3B8"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to listings
      </button>

      {/* Address header */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em" }}>{merged.address}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            merged.neighborhood,
            `${merged.city}, ${merged.state} ${merged.zip_code}`,
          ].filter(Boolean).map((t, i) => (
            <span key={i} style={{
              background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 20,
              padding: "4px 12px", fontSize: 11, color: "#0369A1", fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            merged.property_type && merged.property_type.replace(/_/g, " "),
            merged.beds && `${merged.beds} beds`,
            merged.baths && `${merged.baths} baths`,
            merged.sqft && `${merged.sqft.toLocaleString()} sqft`,
          ].filter(Boolean).map((t, i) => (
            <span key={i} className="capitalize" style={{
              background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8,
              padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0F172A",
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Photo gallery */}
      <div className="mb-6">
        <PhotoGallery photos={photos} address={merged.address} />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <AgentPipeline zipCode={merged.zip_code} onAnalysisComplete={setAnalysis} />

          <Section>
            <WeatherWidget zipCode={merged.zip_code} lat={merged.lat} lon={merged.lon} />
          </Section>

          {loading ? (
            <>
              <SectionSkeleton lines={4} />
              <SectionSkeleton lines={3} />
              <SectionSkeleton lines={4} />
              <SectionSkeleton lines={5} />
              <SectionSkeleton lines={3} />
              <SectionSkeleton lines={5} />
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

        {/* Right sidebar */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <InvestmentSidebar listing={merged} analysis={analysis} />
          </div>
        </div>
      </div>
    </div>
  );
}
