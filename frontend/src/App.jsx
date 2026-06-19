import { useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import Landing from "./components/Landing.jsx";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const { user } = useAuth();
  const [page, setPage] = useState("landing");

  if (user) return <Dashboard />;
  if (page === "auth") return <Login onBack={() => setPage("landing")} />;
  return (
    <Landing
      onGetStarted={() => setPage("auth")}
      onLogin={() => setPage("auth")}
    />
  );
}
