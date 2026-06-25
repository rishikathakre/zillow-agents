import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Key, ExternalLink, Save } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — PropIQ" }] }),
  component: SettingsPage,
});

const KEYS = [
  { id: "openai", label: "OpenAI API Key", required: true, link: "https://platform.openai.com/api-keys", place: "https://platform.openai.com" },
  { id: "rentcast", label: "RentCast API Key", link: "https://rentcast.io", place: "rentcast.io" },
  { id: "openweather", label: "OpenWeatherMap API Key", link: "https://openweathermap.org/api", place: "openweathermap.org" },
  { id: "airnow", label: "AirNow API Key", link: "https://docs.airnowapi.org", place: "airnowapi.org" },
  { id: "gmaps", label: "Google Maps API Key", link: "https://console.cloud.google.com/google/maps-apis", place: "Google Cloud" },
  { id: "bls", label: "BLS API Key (optional)", link: "https://www.bls.gov/developers/", place: "bls.gov" },
];

const AGENTS = [
  ["Market", 18], ["Environmental", 12], ["Flood Risk", 10], ["Schools", 14],
  ["Walkability", 12], ["Rental", 16], ["Employment", 10], ["Synthesizer", 8],
] as const;

function ApiKeyRow({ k }: { k: typeof KEYS[number] }) {
  const [v, setV] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setV(localStorage.getItem(`propiq_key_${k.id}`) ?? ""); }, [k.id]);
  const save = () => {
    localStorage.setItem(`propiq_key_${k.id}`, v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };
  return (
    <div className="flex items-end gap-3 rounded-xl border bg-background p-4">
      <div className="flex-1">
        <label className="flex items-center gap-2 text-xs font-semibold">
          <Key className="h-3.5 w-3.5 text-[var(--brand-blue)]" />
          {k.label}{k.required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="password" value={v} onChange={(e) => setV(e.target.value)} placeholder="sk-…"
          className="mt-1.5 w-full rounded-lg border bg-card px-3 py-2 text-sm font-mono outline-none ring-[var(--brand-blue)] focus:ring-2"
        />
        <a href={k.link} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[var(--brand-blue)] hover:underline">
          Get free key at {k.place} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <button onClick={save} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-navy)] px-4 py-2 text-xs font-semibold text-white">
        <Save className="h-3.5 w-3.5" /> {saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}

function SettingsPage() {
  const [weights, setWeights] = useState<number[]>(AGENTS.map(([, w]) => w));
  const total = weights.reduce((s, x) => s + x, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Configure API keys and scoring weights.</p>

      <div className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold tracking-tight">API Keys</h2>
        <p className="text-xs text-muted-foreground">Stored locally and sent to your backend.</p>
        <div className="mt-5 space-y-3">
          {KEYS.map((k) => <ApiKeyRow key={k.id} k={k} />)}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Scoring Weights</h2>
            <p className="text-xs text-muted-foreground">Tune how much each agent contributes to the final PropIQ score.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${total === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            Total: {total}%
          </span>
        </div>
        <div className="mt-5 space-y-4">
          {AGENTS.map(([name], i) => (
            <div key={name}>
              <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{name}</span><span>{weights[i]}%</span></div>
              <input
                type="range" min={0} max={40} value={weights[i]}
                onChange={(e) => setWeights((w) => w.map((x, j) => j === i ? Number(e.target.value) : x))}
                className="w-full accent-[var(--brand-blue)]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}