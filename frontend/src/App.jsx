import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import Landing from "./components/Landing.jsx";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";

function CursorGlow() {
  const [cursor, setCursor] = useState({ x: -300, y: -300 });
  useEffect(() => {
    const move = (e) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        left: cursor.x,
        top: cursor.y,
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 65%)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 9999,
        transition: "left 0.09s ease, top 0.09s ease",
      }}
    />
  );
}

export default function App() {
  const { user } = useAuth();
  const [page, setPage] = useState("landing");

  if (user) return <><CursorGlow /><Dashboard /></>;
  if (page === "auth") return <><CursorGlow /><Login onBack={() => setPage("landing")} /></>;
  return (
    <>
      <CursorGlow />
      <Landing
        onGetStarted={() => setPage("auth")}
        onLogin={() => setPage("auth")}
      />
    </>
  );
}
