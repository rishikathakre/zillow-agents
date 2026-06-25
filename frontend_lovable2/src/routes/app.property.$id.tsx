import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Download, Bookmark, MapPin, BedDouble, Bath, Maximize, Wind, Droplets, Trees, Thermometer } from "lucide-react";
import { motion } from "framer-motion";
import { getProperty, getWeather, getReport, toggleSaved, getSaved } from "@/lib/propiq/api";
import { type Property, mockPriceHistory, mockEmployment } from "@/lib/propiq/mock";
import { ScoreGauge } from "@/components/propiq/ScoreGauge";
import { AgentPipeline } from "@/components/propiq/AgentPipeline";
import { ScoreBar } from "@/components/propiq/ScoreBar";

export const Route = createFileRoute("/app/property/$id")({
  head: () => ({ meta: [{ title: "Property — PropIQ" }] }),
  component: PropertyPage,
});

function PropertyPage() {
  const { id } = Route.useParams();
  const [p, setP] = useState<Property | null>(null);
  const [w, setW] = useState<any>(null);
  const [report, setReport] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getProperty(id).then((prop) => {
      setP(prop);
      const zip = prop.zip || "10001";
      void getWeather(zip).then(setW);
      void getReport(zip).then(setReport);
    });
    setSaved(getSaved().includes(id));
    const onS = () => setSaved(getSaved().includes(id));
    window.addEventListener("propiq:saved", onS);
    return () => window.removeEventListener("propiq:saved", onS);
  }, [id]);

  if (!p) return <div className="p-10 text-sm text-muted-foreground">Loading analysis…</div>;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Gallery */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl">
          <img src={p.photos?.[0] || p.photo || ""} alt="" className="h-[420px] w-full object-cover" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(p.photos ?? []).slice(1, 5).map((src, i) => (
            <div key={i} className="overflow-hidden rounded-2xl">
              <img src={src} alt="" className="h-[200px] w-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{p.address}</h1>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {p.city}, {p.state} {p.zip}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: BedDouble, label: `${p.beds} beds` },
                { icon: Bath, label: `${p.baths} baths` },
                { icon: Maximize, label: `${(p.sqft || 0).toLocaleString()} sqft` },
                { icon: Wind, label: `AQI ${p.aqi}` },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
              ))}
            </div>
          </div>

          <Tabs defaultValue="score" className="mt-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="score">Investment Score</TabsTrigger>
              <TabsTrigger value="env">Environmental</TabsTrigger>
              <TabsTrigger value="nbh">Neighborhood</TabsTrigger>
              <TabsTrigger value="mkt">Market Intel</TabsTrigger>
            </TabsList>

            <TabsContent value="score" className="mt-6 space-y-6">
              <div className="rounded-2xl border bg-card p-8">
                <ScoreGauge score={p.score} recommendation={p.recommendation} />
              </div>
              <AgentPipeline />
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Score Breakdown</h3>
                <div className="space-y-4">
                  <ScoreBar label="Market Fundamentals" value={84} />
                  <ScoreBar label="Environmental" value={71} color="#10b981" />
                  <ScoreBar label="Flood Risk (inverse)" value={92} color="#0ea5e9" />
                  <ScoreBar label="Schools" value={78} color="#8b5cf6" />
                  <ScoreBar label="Walkability" value={88} color="#f59e0b" />
                  <ScoreBar label="Rental Yield" value={66} color="#ec4899" />
                  <ScoreBar label="Employment Growth" value={73} color="#14b8a6" />
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-3 text-lg font-bold tracking-tight">AI Investment Report</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{report || "Generating report…"}</p>
              </div>
            </TabsContent>

            <TabsContent value="env" className="mt-6 space-y-6">
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Air Quality</h3>
                <div className="flex items-center gap-6">
                  <div className="grid h-32 w-32 place-items-center rounded-full text-3xl font-bold text-white"
                       style={{ background: p.aqi <= 50 ? "#10b981" : p.aqi <= 100 ? "#f59e0b" : "#ef4444" }}>
                    {p.aqi}
                  </div>
                  <div className="flex-1 space-y-3">
                    <ScoreBar label="PM2.5" value={Math.min(100, p.aqi + 5)} color="#ef4444" />
                    <ScoreBar label="Ozone" value={Math.min(100, p.aqi - 10)} color="#f59e0b" />
                    <ScoreBar label="NO₂" value={Math.min(100, p.aqi - 20)} color="#0ea5e9" />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Tree Pollen", v: 4, c: "#10b981", icon: Trees },
                  { label: "Grass Pollen", v: 2, c: "#84cc16", icon: Trees },
                  { label: "Weed Pollen", v: 1, c: "#f59e0b", icon: Trees },
                ].map((x) => (
                  <div key={x.label} className="rounded-2xl border bg-card p-5">
                    <x.icon className="mb-3 h-5 w-5" style={{ color: x.c }} />
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{x.label}</div>
                    <div className="mt-1 text-2xl font-bold">{x.v}/12</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Monthly Pollen Heatmap</h3>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const v = Math.round(Math.sin((i / 12) * Math.PI) * 9 + 2);
                    const op = v / 12;
                    return (
                      <div key={i} className="aspect-square rounded-md text-[10px] font-semibold text-white grid place-items-center"
                           style={{ background: `rgba(16,185,129,${0.2 + op * 0.7})` }}>
                        {["J","F","M","A","M","J","J","A","S","O","N","D"][i]}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-card p-6">
                  <Droplets className="mb-3 h-6 w-6 text-blue-500" />
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Flood Risk</div>
                  <div className="mt-1 text-2xl font-bold">Zone X · Minimal</div>
                  <p className="mt-2 text-xs text-muted-foreground">FEMA designation. Less than 0.2% annual chance.</p>
                </div>
                <div className="rounded-2xl border bg-card p-6">
                  <Thermometer className="mb-3 h-6 w-6 text-orange-500" />
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Climate</div>
                  <div className="mt-1 text-2xl font-bold">Humid Subtropical</div>
                  <p className="mt-2 text-xs text-muted-foreground">+2.1°F projected by 2050. Moderate heat stress.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="nbh" className="mt-6 space-y-6">
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Nearby Schools</h3>
                <div className="space-y-3">
                  {[
                    { name: "Lincoln Elementary", r: 9, d: 0.4 },
                    { name: "Roosevelt Middle School", r: 8, d: 0.9 },
                    { name: "Jefferson High School", r: 7, d: 1.2 },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.d} mi away</div>
                      </div>
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">{s.r}/10</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Walkability</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Walk Score", v: 88, c: "#10b981" },
                    { label: "Transit", v: 92, c: "#0ea5e9" },
                    { label: "Bike", v: 74, c: "#f59e0b" },
                  ].map((x) => {
                    const R = 40, C = 2 * Math.PI * R, o = C - (x.v / 100) * C;
                    return (
                      <div key={x.label} className="flex flex-col items-center">
                        <div className="relative h-28 w-28">
                          <svg viewBox="0 0 100 100" className="-rotate-90">
                            <circle cx="50" cy="50" r={R} stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <motion.circle cx="50" cy="50" r={R} stroke={x.c} strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: o }}
                              transition={{ duration: 1.2 }} />
                          </svg>
                          <div className="absolute inset-0 grid place-items-center text-xl font-bold">{x.v}</div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">{x.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Nearby Amenities</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    ["☕","Coffee Shops","12"],["🍽️","Restaurants","48"],["🛒","Grocery","6"],["🌳","Parks","4"],
                    ["🏥","Hospitals","2"],["🏋️","Gyms","8"],["🚇","Subway","3"],["🏛️","Museums","5"],
                  ].map(([e,n,c]) => (
                    <div key={n} className="rounded-xl border bg-background p-3 text-center">
                      <div className="text-2xl">{e}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{n}</div>
                      <div className="text-lg font-bold">{c}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mkt" className="mt-6 space-y-6">
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">24-Month Price Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <AreaChart data={mockPriceHistory}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Area type="monotone" dataKey="price" stroke="#2563EB" fill="url(#g1)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Median Sale", "$742k", "+6.3% YoY"],
                  ["Days on Market", "23", "-12% YoY"],
                  ["Cap Rate", "7.4%", "+0.4 pp"],
                ].map(([l,v,d]) => (
                  <div key={l} className="rounded-2xl border bg-card p-5">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
                    <div className="mt-1 text-2xl font-bold">{v}</div>
                    <div className="mt-1 text-xs text-emerald-600">{d}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Employment Trend</h3>
                <div className="h-56">
                  <ResponsiveContainer>
                    <LineChart data={mockEmployment}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="jobs" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-6">
              <div className="text-3xl font-bold tracking-tight">${p.price.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">${p.sqft ? Math.round(p.price / p.sqft) : "—"}/sqft</div>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Est. Rent</span><span className="font-semibold">${Math.round(p.price * 0.005).toLocaleString()}/mo</span></div>
                <div className="flex justify-between"><span>Cap Rate</span><span className="font-semibold">7.4%</span></div>
                <div className="flex justify-between"><span>Cash on Cash</span><span className="font-semibold">9.1%</span></div>
                <div className="flex justify-between"><span>5yr Appreciation</span><span className="font-semibold text-emerald-600">+11%</span></div>
              </div>
            </div>
            <div
              className="rounded-2xl p-6 text-white"
              style={{ background: p.recommendation === "BUY" ? "linear-gradient(135deg,#10b981,#059669)" : p.recommendation === "HOLD" ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#ef4444,#dc2626)" }}
            >
              <div className="text-xs uppercase tracking-widest opacity-80">Recommendation</div>
              <div className="mt-1 text-3xl font-bold">{p.recommendation}</div>
              <div className="mt-2 text-xs opacity-90">PropIQ Score {p.score}/100 — multi-agent consensus.</div>
            </div>
            {w && (
              <div className="rounded-2xl border bg-card p-6">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Conditions</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-2xl font-bold">{w?.temp ?? "—"}°</div><div className="text-[10px] text-muted-foreground">{w?.condition ?? "—"}</div></div>
                  <div><div className="text-2xl font-bold">{w?.aqi ?? "—"}</div><div className="text-[10px] text-muted-foreground">AQI</div></div>
                  <div><div className="text-2xl font-bold">{w?.pollen?.tree ?? "—"}</div><div className="text-[10px] text-muted-foreground">Pollen</div></div>
                </div>
              </div>
            )}
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-navy)] py-3 text-sm font-semibold text-white transition hover:opacity-90">
              <Download className="h-4 w-4" /> Download Detailed Report
            </button>
            <button
              onClick={() => toggleSaved(p.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card py-3 text-sm font-semibold transition hover:bg-muted"
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
              {saved ? "Saved to My Analyses" : "Save to My Analyses"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}