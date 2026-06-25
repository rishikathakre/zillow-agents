import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { searchListings } from "@/lib/propiq/api";
import { PropertyCard } from "@/components/propiq/PropertyCard";
import type { Property } from "@/lib/propiq/mock";

const CHIPS = ["New York", "Miami", "Austin", "Seattle", "Denver", "Nashville"];

export const Route = createFileRoute("/app/search")({
  head: () => ({ meta: [{ title: "Search — PropIQ" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("New York");
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => { void run(q); }, []); // eslint-disable-line

  async function run(query: string) {
    setLoading(true);
    const list = await searchListings(query);
    setItems(list);
    setLoading(false);
  }

  return (
    <div>
      <section className="relative overflow-hidden" style={{ background: "var(--brand-navy)" }}>
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.4), transparent 50%)" }} />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center text-white">
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight md:text-5xl"
          >
            Find your next investment property
          </motion.h1>
          <p className="mt-4 text-white/60">Real AQI, pollen & flood risk — the data Zillow removed.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); run(q); }}
            className="mx-auto mt-8 flex max-w-2xl items-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl shadow-blue-500/10"
          >
            <Search className="ml-4 h-5 w-5 text-slate-400" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="City, ZIP, or address"
              className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button type="submit" className="rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-blue-glow)]">
              Search
            </button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {CHIPS.map((c) => (
              <button
                key={c} onClick={() => { setQ(c); run(c); }}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{items.length} properties in {q}</h2>
          <span className="text-xs text-muted-foreground">Sorted by PropIQ Score</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p, i) => <PropertyCard key={p.id} p={p} i={i} />)}
          </div>
        )}
      </section>
      <span className="hidden" onClick={() => nav({ to: "/app/search" })} />
    </div>
  );
}