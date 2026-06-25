import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import SearchProperty from "./SearchProperty.jsx";
import MyAnalyses from "./MyAnalyses.jsx";
import MarketMap from "./MarketMap.jsx";
import Settings from "./Settings.jsx";

const NAV = [
  { id: "search", label: "Search Properties", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg>
  )},
  { id: "analyses", label: "My Analyses", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-4 4 4 5-5"/></svg>
  )},
  { id: "map", label: "Market Map", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
  )},
  { id: "saved", label: "Saved Reports", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
  )},
  { id: "settings", label: "Settings", icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  )},
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
    <div className="min-h-screen bg-surface flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-[240px] flex flex-col z-40 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
        style={{
          background: "#0C1A2E",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 12px",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <div style={{
              width: 28, height: 28, background: "#0EA5E9", borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>P</span>
            </div>
            <span style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 14 }}>PropIQ</span>
          </div>
        </div>

        {/* User */}
        <div style={{ padding: "12px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 32, height: 32, background: "#1E3A5F",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#94A3B8", fontSize: 12, fontWeight: 600,
            }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p style={{ color: "#F1F5F9", fontSize: 12, fontWeight: 500 }} className="truncate">{user?.name}</p>
              <p style={{ color: "#475569", fontSize: 10 }} className="truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-2 space-y-0.5">
          {NAV.map(({ id, icon, label }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => { setSection(id); setSidebarOpen(false); }}
                className="w-full flex items-center gap-[10px] rounded-lg transition-all duration-150"
                style={{
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  color: active ? "#38BDF8" : "#475569",
                  background: active ? "rgba(14,165,233,0.15)" : "transparent",
                  boxShadow: active ? "inset 2px 0 0 #0EA5E9" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "#94A3B8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#475569";
                  }
                }}
              >
                <span style={{ opacity: active ? 1 : 0.5 }}>{icon}</span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-lg transition-all duration-150"
            style={{ padding: "8px 10px", fontSize: 12, fontWeight: 500, color: "#475569", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg className="w-4 h-4" style={{ opacity: 0.6 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Log Out
          </button>
          <p style={{ color: "#1E3A5F", fontSize: 10, marginTop: 8, padding: "0 8px" }}>PropIQ v2.1 &middot; Agentic AI</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 px-5 py-4" style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg"
            style={{ background: "#F1F5F9", color: "#475569" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <span style={{ fontWeight: 600, color: "#0F172A" }}>PropIQ</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto" style={{ background: "#F8FAFC" }}>
          <div className="page-enter">
            {section === "search" && <SearchProperty />}
            {section === "analyses" && <MyAnalyses onViewReport={() => setSection("search")} />}
            {section === "map" && <MarketMap />}
            {section === "saved" && <MyAnalyses onViewReport={() => setSection("search")} />}
            {section === "settings" && <Settings />}
          </div>
        </main>
      </div>
    </div>
  );
}
