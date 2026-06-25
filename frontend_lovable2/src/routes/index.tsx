import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PropIQ — AI Real Estate Investment Analysis" },
      { name: "description", content: "8 specialist AI agents analyze every property — AQI, pollen, flood risk, schools, comps." },
    ],
  }),
  component: Index,
});

function Index() {
  if (typeof window !== "undefined") {
    const dest = localStorage.getItem("propiq_token") ? "/app/search" : "/login";
    window.location.replace(dest);
  }
  return null;
}
