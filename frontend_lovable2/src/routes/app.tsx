import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/propiq/AppShell";

export const Route = createFileRoute("/app")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});