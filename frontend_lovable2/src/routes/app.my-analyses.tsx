import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { getSaved, toggleSaved } from "@/lib/propiq/api";
import { mockProperties, type Property } from "@/lib/propiq/mock";

export const Route = createFileRoute("/app/my-analyses")({
  head: () => ({ meta: [{ title: "My Analyses — PropIQ" }] }),
  component: MyAnalyses,
});

function MyAnalyses() {
  const [filter, setFilter] = useState<"ALL" | "BUY" | "HOLD" | "PASS">("ALL");
  const [saved, setSaved] = useState<Property[]>([]);

  useEffect(() => {
    const sync = () => {
      const ids = new Set(getSaved());
      setSaved(mockProperties.filter((p) => ids.has(p.id)));
    };
    sync();
    window.addEventListener("propiq:saved", sync);
    return () => window.removeEventListener("propiq:saved", sync);
  }, []);

  const filtered = filter === "ALL" ? saved : saved.filter((p) => p.recommendation === filter);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Analyses</h1>
          <p className="text-sm text-muted-foreground">Properties you've saved for further review.</p>
        </div>
        <div className="flex gap-2">
          {(["ALL", "BUY", "HOLD", "PASS"] as const).map((f) => (
            <button
              key={f} onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${
                filter === f ? "border-transparent bg-[var(--brand-navy)] text-white" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-16 text-center">
          <div className="text-5xl">🔖</div>
          <h3 className="mt-3 font-semibold">No saved analyses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Save properties from the search page to track them here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 text-left">Photo</th>
                <th className="p-4 text-left">Address</th>
                <th className="p-4 text-left">ZIP</th>
                <th className="p-4 text-left">Score</th>
                <th className="p-4 text-left">Recommendation</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/50">
                  <td className="p-3"><img src={p.photo} alt="" className="h-14 w-20 rounded-lg object-cover" /></td>
                  <td className="p-3 font-medium">{p.address}<div className="text-xs text-muted-foreground">{p.city}, {p.state}</div></td>
                  <td className="p-3 text-muted-foreground">{p.zip}</td>
                  <td className="p-3"><span className="rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">{p.score}</span></td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${
                      p.recommendation === "BUY" ? "bg-emerald-500" : p.recommendation === "HOLD" ? "bg-amber-500" : "bg-red-500"
                    }`}>{p.recommendation}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to="/app/property/$id" params={{ id: p.id }} className="rounded-lg border p-2 hover:bg-muted"><ExternalLink className="h-4 w-4" /></Link>
                      <button onClick={() => toggleSaved(p.id)} className="rounded-lg border p-2 hover:bg-muted"><Trash2 className="h-4 w-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}