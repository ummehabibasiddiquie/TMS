import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import {
  getAdminDashboardStats,
  getTeamLeadDashboardStats,
} from "@/lib/dashboard-stats";
import { AdminOverview, TeamLeadOverview } from "@/components/dashboard/ManagementOverview";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  if (user.role === "TRAINEE") {
    redirect("/trainee");
  }

  if (user.role === "ADMIN") {
    const stats = await getAdminDashboardStats();
    return (
      <AppShell user={user}>
        <AdminOverview name={user.name} stats={stats} />
      </AppShell>
    );
  }

  if (user.role === "TRAINER" || user.role === "TEAM_LEAD") {
    const stats = await getTeamLeadDashboardStats(user.id);
    return (
      <AppShell user={user}>
        <TeamLeadOverview name={user.name} stats={stats} />
      </AppShell>
    );
  }

  redirect("/login");
}
