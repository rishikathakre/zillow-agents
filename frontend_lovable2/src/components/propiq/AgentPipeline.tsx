import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { mockAgents } from "@/lib/propiq/mock";

type Status = "wait" | "run" | "done";

export function AgentPipeline() {
  const [states, setStates] = useState<{ status: Status; score?: number; t: number }[]>(
    mockAgents.map(() => ({ status: "wait", t: 0 })),
  );
  const [running, setRunning] = useState(0);

  useEffect(() => {
    if (running >= mockAgents.length) return;
    setStates((s) => s.map((x, i) => (i === running ? { ...x, status: "run" } : x)));
    const start = Date.now();
    const tick = setInterval(() => {
      setStates((s) => s.map((x, i) => (i === running ? { ...x, t: Date.now() - start } : x)));
    }, 100);
    const done = setTimeout(() => {
      clearInterval(tick);
      setStates((s) => s.map((x, i) => (i === running ? { status: "done", score: 70 + Math.round(Math.random() * 28), t: Date.now() - start } : x)));
      setRunning((r) => r + 1);
    }, 900 + Math.random() * 700);
    return () => { clearInterval(tick); clearTimeout(done); };
  }, [running]);

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight">🤖 Agentic AI Pipeline</h3>
        <span className="text-xs text-muted-foreground">{Math.min(running, mockAgents.length)} / {mockAgents.length} complete</span>
      </div>
      <div className="space-y-2">
        {mockAgents.map((a, i) => {
          const s = states[i];
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
              <div className="text-2xl">{a.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{a.name}</span>
                  {s.status === "run" && <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-blue-500" />}
                </div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
                {s.status === "run" && (
                  <div className="mt-2 h-1 overflow-hidden rounded bg-blue-100">
                    <div className="shimmer h-full w-full" />
                  </div>
                )}
              </div>
              <div className="text-right">
                {s.status === "wait" && <span className="text-xs text-muted-foreground">⏳ waiting</span>}
                {s.status === "run" && <span className="text-xs font-medium text-blue-600">⚡ {(s.t / 1000).toFixed(1)}s</span>}
                {s.status === "done" && (
                  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                    <span className="text-xs text-emerald-600">✅</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{s.score}</span>
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}