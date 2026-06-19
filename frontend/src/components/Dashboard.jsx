import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import SearchProperty from "./SearchProperty.jsx";
import MyAnalyses from "./MyAnalyses.jsx";
import MarketMap from "./MarketMap.jsx";
import Settings from "./Settings.jsx";

const NAV = [
  { id: "search", icon: "🏠", label: "Search Properties" },
  { id: "analyses", icon: "📊", label: "My Analyses" },
  { id: "map", icon: "🗺️", label: "Market Map" },
  { id: "saved", icon: "💾", label: "Saved Reports" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [section, setSection] = useState("search");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] bg-slate-900 text-white z-40 flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">P</span>
          </div>
          <span className="font-black text-white text-xl tracking-tight">PropIQ</span>
        </div>

        {/* User */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => { setSection(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                section === id
                  ? "bg-green-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span>🚪</span>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 px-5 py-4 bg-white border-b border-slate-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700"
          >
            ☰
          </button>
          <span className="font-black text-slate-900">PropIQ</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto">
          {section === "search" && <SearchProperty />}
          {section === "analyses" && <MyAnalyses onViewReport={() => setSection("search")} />}
          {section === "map" && <MarketMap />}
          {section === "saved" && <MyAnalyses onViewReport={() => setSection("search")} />}
          {section === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}
