import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { login } from "@/lib/propiq/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — PropIQ" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await login(email, password);
    nav({ to: "/app/search" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative flex flex-col justify-between p-10 text-white" style={{ background: "var(--brand-navy)" }}>
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-blue)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold">PropIQ</div>
            <div className="text-[11px] uppercase tracking-widest text-white/50">Agentic AI</div>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Real estate analysis powered by 8 specialist AI agents.
          </h1>
          <p className="mt-4 max-w-md text-white/60">The data Zillow removed — and the AI to make sense of it.</p>
          <ul className="mt-10 space-y-4 text-sm text-white/80">
            {[
              "8 AI agents analyze every property",
              "Real AQI, pollen & flood data",
              "Explainable AI scoring",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--brand-blue)]/20 text-[var(--brand-blue-glow)]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
        <div className="text-xs text-white/40">© {new Date().getFullYear()} PropIQ Labs</div>
      </div>
      <div className="flex items-center justify-center bg-background p-10">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your PropIQ workspace.</p>
          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none ring-[var(--brand-blue)] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none ring-[var(--brand-blue)] focus:ring-2"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-[var(--brand-blue)] py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[var(--brand-blue-glow)] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-center text-xs text-muted-foreground">Any email + password works in demo mode.</p>
          </div>
        </form>
      </div>
    </div>
  );
}