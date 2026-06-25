import { Link } from "@tanstack/react-router";
import { Heart, BedDouble, Bath, Maximize } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getSaved, toggleSaved } from "@/lib/propiq/api";
import type { Property } from "@/lib/propiq/mock";

const aqiColor = (a: number) =>
  a <= 50 ? "bg-emerald-500" : a <= 100 ? "bg-amber-500" : a <= 150 ? "bg-orange-500" : "bg-red-500";

export function PropertyCard({ p, i = 0 }: { p: Property; i?: number }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => setSaved(getSaved().includes(p.id));
    sync();
    window.addEventListener("propiq:saved", sync);
    return () => window.removeEventListener("propiq:saved", sync);
  }, [p.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="card-lift group overflow-hidden rounded-2xl border bg-card"
    >
      <Link to="/app/property/$id" params={{ id: p.id }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={p.photo}
            alt={p.address}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow ${aqiColor(p.aqi)}`}>
            AQI {p.aqi}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-[var(--brand-blue)] px-2.5 py-1 text-xs font-bold text-white shadow">
            {p.score}
          </div>
          <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-800 shadow">
            {p.type}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); toggleSaved(p.id); }}
            className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow transition hover:scale-110"
            aria-label="Save"
          >
            <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : "text-slate-700"}`} />
          </button>
        </div>
        <div className="p-4">
          <div className="text-lg font-bold tracking-tight">${p.price.toLocaleString()}</div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">{p.address}, {p.city}, {p.state}</div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.beds}</span>
            <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.baths}</span>
            <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{p.sqft.toLocaleString()} sqft</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}