import { createFileRoute } from "@tanstack/react-router";
import { Brain, Workflow, Network, Eye, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/learn")({
  head: () => ({ meta: [{ title: "Learn Agentic AI — PropIQ" }] }),
  component: LearnPage,
});

const LESSONS = [
  { icon: Brain, title: "What is an AI Agent?", desc: "From single-prompt LLMs to autonomous goal-seeking agents.", time: "8 min" },
  { icon: Workflow, title: "Pipelines vs. Single Calls", desc: "How chaining specialist agents beats one mega-prompt.", time: "10 min" },
  { icon: Network, title: "Multi-Agent Orchestration", desc: "Coordinator patterns, hand-offs, and shared memory.", time: "12 min" },
  { icon: Eye, title: "Explainable AI Scoring", desc: "Why every score must be auditable, not magical.", time: "9 min" },
  { icon: Sparkles, title: "Build Your Own Agent", desc: "Wire up an environmental analysis agent end-to-end.", time: "20 min" },
];

function LearnPage() {
  const progress = 38;
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-2xl p-8 text-white" style={{ background: "linear-gradient(135deg, var(--brand-navy), #1e3a8a)" }}>
        <div className="text-xs uppercase tracking-widest text-white/60">Course</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Learn Agentic AI with Real Estate</h1>
        <p className="mt-2 max-w-xl text-sm text-white/70">Master the architecture behind PropIQ — 8 specialist agents collaborating on real investment decisions.</p>
        <div className="mt-6 max-w-md">
          <div className="mb-2 flex justify-between text-xs"><span>Your progress</span><span>{progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[var(--brand-blue-glow)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((L, i) => (
          <div key={L.title} className="card-lift rounded-2xl border bg-card p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[var(--brand-blue)]">
              <L.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Lesson {i + 1} · {L.time}</div>
            <h3 className="mt-1 text-lg font-bold tracking-tight">{L.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{L.desc}</p>
            <button className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-blue-glow)]">
              Start Lesson <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}