import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Bookmark, Settings, GraduationCap, LogOut, Building2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CursorGlow } from "./CursorGlow";
import { getUser, isDemoMode, logout } from "@/lib/propiq/api";

const NAV = [
  { to: "/app/search", label: "Search", icon: Search },
  { to: "/app/my-analyses", label: "My Analyses", icon: Bookmark },
  { to: "/app/learn", label: "Learn Agentic AI", icon: GraduationCap },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [demo, setDemo] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    if (!getUser()) nav({ to: "/login" });
    const onDemo = () => setDemo(isDemoMode());
    window.addEventListener("propiq:demo", onDemo);
    const t = setInterval(() => setDemo(isDemoMode()), 1500);
    return () => { window.removeEventListener("propiq:demo", onDemo); clearInterval(t); };
  }, [nav]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <CursorGlow />
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col md:flex"
        style={{ background: "var(--brand-navy)", color: "white" }}
      >
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-blue)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">PropIQ</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50">Agentic AI</div>
          </div>
        </div>
        <nav className="flex-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--brand-blue)] text-white shadow-lg shadow-blue-500/20"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-4">
          <div className="mb-2 truncate text-xs text-white/50">{user}</div>
          <button
            onClick={() => { logout(); nav({ to: "/login" }); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {demo && (
          <div className="bg-amber-50 px-6 py-2 text-center text-xs font-medium text-amber-900">
            Demo Mode — backend at localhost:8000 unreachable, showing mock data
          </div>
        )}
        {children}
      </main>
    </div>
  );
}